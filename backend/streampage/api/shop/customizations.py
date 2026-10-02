import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from streampage.api.middleware.authenticator import require_creator
from streampage.api.shop.common import shipping_method_label
from streampage.api.shop.models import (
    CustomizationQueueRow,
    CustomizationUpdateRequest,
    WaitlistEntry,
)
from streampage.db.engine import get_db_session
from streampage.db.enums import ProductCategory, OrderStatus
from streampage.db.models import (
    Product,
    Order,
    OrderItem,
    OrderCustomization,
    User,
)
from streampage.services.storage import (
    storage_service,
    ALLOWED_IMAGE_EXTENSIONS,
)


customizations_router = APIRouter()


# ---------------------------------------------------------------------------
# Custom-card-art queue
# ---------------------------------------------------------------------------

def _customization_to_queue_row(
    customization: OrderCustomization,
    order: Order,
    product_name: str,
    order_total_quantity: int,
    category: ProductCategory,
) -> CustomizationQueueRow:
    return CustomizationQueueRow(
        id=str(customization.id),
        kind="custom",
        quantity=1,
        order_id=str(order.id),
        order_id_short=str(order.id)[:8],
        order_status=order.status.value,
        order_created_at=order.created_at,
        card_name=customization.card_name,
        description=customization.description,
        is_complete=customization.is_complete,
        image_url=customization.image_url,
        completed_at=customization.completed_at,
        customer_first_name=order.customer_first_name,
        customer_last_name=order.customer_last_name,
        customer_email=order.customer_email,
        customer_discord_handle=order.customer_discord_handle,
        shipping_street=order.shipping_street,
        shipping_city=order.shipping_city,
        shipping_state=order.shipping_state,
        shipping_zip=order.shipping_zip,
        shipping_country=order.shipping_country,
        shipping_method=shipping_method_label(order.shipping_method),
        product_name=product_name,
        order_total_quantity=order_total_quantity,
        is_preorder=category == ProductCategory.PREORDER,
    )


def _orderitem_to_queue_row(
    item: OrderItem,
    order: Order,
    product_name: str,
    order_total_quantity: int,
    category: ProductCategory,
) -> CustomizationQueueRow:
    """Map a non-custom ``OrderItem`` (stickers/tokens/etc.) into a queue row.

    ``card_name`` is the product name, ``description`` is blank, ``image_url``
    is None (image upload UI is hidden client-side for this kind)."""
    return CustomizationQueueRow(
        id=str(item.id),
        kind="item",
        quantity=item.quantity,
        order_id=str(order.id),
        order_id_short=str(order.id)[:8],
        order_status=order.status.value,
        order_created_at=order.created_at,
        card_name=product_name,
        description="",
        is_complete=item.is_complete,
        image_url=None,
        customer_first_name=order.customer_first_name,
        customer_last_name=order.customer_last_name,
        customer_email=order.customer_email,
        customer_discord_handle=order.customer_discord_handle,
        shipping_street=order.shipping_street,
        shipping_city=order.shipping_city,
        shipping_state=order.shipping_state,
        shipping_zip=order.shipping_zip,
        shipping_country=order.shipping_country,
        shipping_method=shipping_method_label(order.shipping_method),
        product_name=product_name,
        order_total_quantity=order_total_quantity,
        is_preorder=category == ProductCategory.PREORDER,
    )


def _sum_order_quantity(session: Session, order_id: uuid.UUID) -> int:
    """Total physical units in an order (sum of OrderItem.quantity, including
    non-custom items like stickers/tokens)."""
    return (
        session.execute(
            select(func.coalesce(func.sum(OrderItem.quantity), 0))
            .where(OrderItem.order_id == order_id)
        ).scalar()
        or 0
    )


@customizations_router.get("/customizations", response_model=list[CustomizationQueueRow])
def list_customizations(
    status: OrderStatus | None = Query(None),
    user: User = Depends(require_creator),
):
    """Admin fulfillment queue covering every line item across every order.

    Custom-card-art products explode into one row per ``order_customization``
    (each individual drawing is tracked separately), while non-custom items
    (stickers, tokens, etc.) collapse to one row per ``order_item`` carrying
    the line ``quantity``. Sorted to-do first (``is_complete = false``), then
    by the parent order's creation time so the oldest unfinished work is at
    the top.
    """
    with get_db_session() as session:
        items_stmt = (
            select(OrderItem, Order, Product)
            .join(Order, Order.id == OrderItem.order_id)
            .join(Product, Product.id == OrderItem.product_id)
        )
        if status is not None:
            items_stmt = items_stmt.where(Order.status == status)

        item_rows = session.execute(items_stmt).all()
        if not item_rows:
            return []

        item_ids = [i.id for i, _, _ in item_rows]
        customizations = session.execute(
            select(OrderCustomization)
            .where(OrderCustomization.order_item_id.in_(item_ids))
            .order_by(
                OrderCustomization.is_complete.asc(),
                OrderCustomization.created_at.asc(),
            )
        ).scalars().all()
        customs_by_item: dict[uuid.UUID, list[OrderCustomization]] = {}
        for c in customizations:
            customs_by_item.setdefault(c.order_item_id, []).append(c)

        # Per-order totals so each row can show the full order's physical
        # unit count (sum of every OrderItem.quantity in the order).
        order_ids = {o.id for _, o, _ in item_rows}
        totals_rows = session.execute(
            select(OrderItem.order_id, func.coalesce(func.sum(OrderItem.quantity), 0))
            .where(OrderItem.order_id.in_(order_ids))
            .group_by(OrderItem.order_id)
        ).all()
        totals_by_order = {oid: int(qty) for oid, qty in totals_rows}

        result: list[CustomizationQueueRow] = []
        for item, order, product in item_rows:
            total_qty = totals_by_order.get(order.id, 0)
            if product.category == ProductCategory.CUSTOM:
                for c in customs_by_item.get(item.id, []):
                    result.append(
                        _customization_to_queue_row(
                            c, order, product.name, total_qty, product.category
                        )
                    )
            else:
                result.append(
                    _orderitem_to_queue_row(
                        item, order, product.name, total_qty, product.category
                    )
                )

        # Stable sort: to-do first, then oldest order first.
        result.sort(key=lambda r: (r.is_complete, r.order_created_at))
        return result


@customizations_router.get("/waitlist", response_model=list[WaitlistEntry])
def list_waitlist():
    """Public, no-auth slim view of every custom-card-art request.

    Returns just enough fields to power the public waitlist UI on ``/shop``
    (image gallery + Discord-name popover) without leaking customer PII like
    full names, emails, or shipping addresses. Sorted FIFO (oldest order
    first); the frontend reverses for the newest-first gallery.
    """
    with get_db_session() as session:
        rows = session.execute(
            select(OrderCustomization, Order)
            .join(Order, Order.id == OrderCustomization.order_id)
            .join(OrderItem, OrderItem.id == OrderCustomization.order_item_id)
            .join(Product, Product.id == OrderItem.product_id)
            .where(Product.category == ProductCategory.CUSTOM)
            .order_by(
                Order.created_at.asc(),
                OrderCustomization.created_at.asc(),
            )
        ).all()

        return [
            WaitlistEntry(
                id=str(c.id),
                card_name=c.card_name,
                image_url=c.image_url,
                is_complete=c.is_complete,
                customer_discord_handle=o.customer_discord_handle,
                order_created_at=o.created_at,
                created_at=c.created_at,
                completed_at=c.completed_at,
                notes=c.notes,
            )
            for c, o in rows
        ]


def _parse_customization_uuid(customization_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(customization_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Customization not found")


def _parse_order_item_uuid(order_item_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(order_item_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Order item not found")


def _load_customization_with_order(
    session: Session, customization_id: uuid.UUID
) -> tuple[OrderCustomization, Order, Product]:
    row = session.execute(
        select(OrderCustomization, Order, Product)
        .join(Order, Order.id == OrderCustomization.order_id)
        .join(OrderItem, OrderItem.id == OrderCustomization.order_item_id)
        .join(Product, Product.id == OrderItem.product_id)
        .where(OrderCustomization.id == customization_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Customization not found")
    return row[0], row[1], row[2]


def _load_order_item_with_order(
    session: Session, order_item_id: uuid.UUID
) -> tuple[OrderItem, Order, Product]:
    row = session.execute(
        select(OrderItem, Order, Product)
        .join(Order, Order.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id)
        .where(OrderItem.id == order_item_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Order item not found")
    return row[0], row[1], row[2]


@customizations_router.patch(
    "/customizations/{customization_id}", response_model=CustomizationQueueRow
)
def update_customization(
    customization_id: str,
    body: CustomizationUpdateRequest,
    _: User = Depends(require_creator),
):
    """Toggle the ``is_complete`` flag on a single card art request."""
    cust_uuid = _parse_customization_uuid(customization_id)

    with get_db_session() as session:
        customization, order, product = _load_customization_with_order(
            session, cust_uuid
        )

        if body.is_complete is not None:
            if body.is_complete and not customization.is_complete:
                customization.completed_at = datetime.utcnow()
            elif not body.is_complete:
                customization.completed_at = None
            customization.is_complete = body.is_complete

        if body.notes is not None:
            customization.notes = body.notes if body.notes else None

        session.commit()
        session.refresh(customization)
        total_qty = _sum_order_quantity(session, order.id)
        return _customization_to_queue_row(
            customization, order, product.name, total_qty, product.category
        )


@customizations_router.post(
    "/customizations/{customization_id}/image",
    response_model=CustomizationQueueRow,
)
async def upload_customization_image(
    customization_id: str,
    file: UploadFile = File(...),
    user: User = Depends(require_creator),
):
    """Attach (or replace) the finished card-art image for a customization.

    Stored in Supabase under ``shop/customizations/``. If the row already had
    an image URL pointing at our bucket, the previous object is best-effort
    deleted after the new URL is committed.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported image type. Allowed: "
                f"{', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
            ),
        )

    contents = await file.read()
    new_url = storage_service.upload_image(contents, "shop/customizations", ext)

    cust_uuid = _parse_customization_uuid(customization_id)
    with get_db_session() as session:
        customization, order, product = _load_customization_with_order(
            session, cust_uuid
        )

        previous_url = customization.image_url
        customization.image_url = new_url
        session.commit()
        session.refresh(customization)
        total_qty = _sum_order_quantity(session, order.id)
        response = _customization_to_queue_row(
            customization, order, product.name, total_qty, product.category
        )

    if previous_url and previous_url != new_url and "supabase.co" in previous_url:
        storage_service.delete_object(previous_url)

    return response


@customizations_router.delete(
    "/customizations/{customization_id}/image",
    response_model=CustomizationQueueRow,
)
def delete_customization_image(
    customization_id: str,
    user: User = Depends(require_creator),
):
    """Remove the attached image (best-effort delete from storage)."""
    cust_uuid = _parse_customization_uuid(customization_id)

    with get_db_session() as session:
        customization, order, product = _load_customization_with_order(
            session, cust_uuid
        )

        previous_url = customization.image_url
        customization.image_url = None
        session.commit()
        session.refresh(customization)
        total_qty = _sum_order_quantity(session, order.id)
        response = _customization_to_queue_row(
            customization, order, product.name, total_qty, product.category
        )

    if previous_url and "supabase.co" in previous_url:
        storage_service.delete_object(previous_url)

    return response


@customizations_router.patch(
    "/order-items/{order_item_id}", response_model=CustomizationQueueRow
)
def update_order_item(
    order_item_id: str,
    body: CustomizationUpdateRequest,
    user: User = Depends(require_creator),
):
    """Toggle ``is_complete`` on a non-custom order item (sticker/token/etc.).

    Mirrors :func:`update_customization` but for the ``order_item`` table so
    the unified admin queue can check off any row regardless of kind.
    """
    item_uuid = _parse_order_item_uuid(order_item_id)

    with get_db_session() as session:
        item, order, product = _load_order_item_with_order(session, item_uuid)

        if body.is_complete is not None:
            item.is_complete = body.is_complete

        session.commit()
        session.refresh(item)
        total_qty = _sum_order_quantity(session, order.id)
        return _orderitem_to_queue_row(
            item, order, product.name, total_qty, product.category
        )
