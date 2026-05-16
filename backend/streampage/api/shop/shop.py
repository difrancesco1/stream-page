import logging
import re
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from streampage.api.middleware.authenticator import require_creator
from streampage.config import FRONTEND_URL, SHOP_ADMIN_EMAIL
from streampage.api.shop.models import (
    ContactRequest,
    CustomizationQueueRow,
    CustomizationUpdateRequest,
    ProductResponse,
    ProductMediaResponse,
    ProductMediaUpdate,
    ProductMediaReorderRequest,
    OrderCreateRequest,
    OrderCreateResponse,
    OrderCaptureResponse,
    OrderCustomizationResponse,
    OrderDetail,
    OrderItemResponse,
    OrderSummary,
    OrderUpdateRequest,
    ResponseMessage,
    WaitlistEntry,
)
from streampage.db.engine import get_db_session
from streampage.db.enums import ProductCategory, ProductMediaType, OrderStatus, ShippingMethod
from streampage.db.models import (
    Product,
    ProductMedia,
    Order,
    OrderItem,
    OrderCustomization,
    User,
)
from streampage.services.email import (
    OrderEmailContext,
    OrderEmailLineItem,
    send_contact_email,
    send_order_admin_notification_email,
    send_order_receipt_email,
)
from streampage.services.paypal import paypal_service
from streampage.services.storage import (
    storage_service,
    ALLOWED_IMAGE_EXTENSIONS,
    ALLOWED_VIDEO_EXTENSIONS,
    MAX_VIDEO_BYTES,
)

logger = logging.getLogger(__name__)

shop_router = APIRouter()


TRACKING_COST = 6.0
NO_TRACKING_COST = 1.0
CUSTOM_PICKUP_DISCOUNT_PER_UNIT = 10.0
PICKUP_ALLOWED_STATES = {"WA"}


_SHIPPING_METHOD_LABELS = {
    ShippingMethod.TRACKING: "Tracking",
    ShippingMethod.NO_TRACKING: "No tracking",
    ShippingMethod.PICKUP: "Pickup",
}


def _shipping_method_label(method: ShippingMethod | None) -> str | None:
    return _SHIPPING_METHOD_LABELS.get(method) if method else None


def _compute_shipping_and_discount(
    method: ShippingMethod,
    shipping_state: str,
    products: list[Product],
    qty_map: dict[uuid.UUID, int],
) -> tuple[float, float]:
    """Return ``(shipping_cost, discount_amount)`` for the given checkout.

    Raises ``HTTPException(400)`` if the combination is invalid (currently:
    PICKUP requires ``shipping_state`` in :data:`PICKUP_ALLOWED_STATES`).
    """
    if method == ShippingMethod.TRACKING:
        return TRACKING_COST, 0.0
    if method == ShippingMethod.NO_TRACKING:
        return NO_TRACKING_COST, 0.0
    if method == ShippingMethod.PICKUP:
        if shipping_state not in PICKUP_ALLOWED_STATES:
            raise HTTPException(
                status_code=400,
                detail="Pickup is only available for Washington (WA) addresses",
            )
        custom_units = sum(
            qty_map.get(p.id, 0)
            for p in products
            if p.category == ProductCategory.CUSTOM
        )
        return 0.0, CUSTOM_PICKUP_DISCOUNT_PER_UNIT * custom_units
    raise HTTPException(status_code=400, detail="Invalid shipping method")


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


def _media_to_response(m: ProductMedia) -> ProductMediaResponse:
    return ProductMediaResponse(
        id=str(m.id),
        url=m.url,
        media_type=m.media_type.value,
        display_order=m.display_order,
        is_featured=m.is_featured,
        created_at=m.created_at,
    )


def _product_to_response(p: Product) -> ProductResponse:
    return ProductResponse(
        id=str(p.id),
        category=p.category.value,
        name=p.name,
        slug=p.slug,
        description=p.description,
        price=float(p.price),
        quantity=p.quantity,
        media=[_media_to_response(m) for m in p.media],
        is_active=p.is_active,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

def _load_product(session: Session, product_id: str) -> Product:
    product = session.execute(
        select(Product)
        .where(Product.id == uuid.UUID(product_id))
        .options(selectinload(Product.media))
    ).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


def _ensure_unique_slug(session: Session, slug: str, exclude_id: uuid.UUID | None = None) -> str:
    stmt = select(Product).where(Product.slug == slug)
    if exclude_id is not None:
        stmt = stmt.where(Product.id != exclude_id)
    existing = session.execute(stmt).scalar_one_or_none()
    if existing:
        return f"{slug}-{uuid.uuid4().hex[:6]}"
    return slug


@shop_router.post("/products", response_model=ProductResponse)
async def create_product(
    name: str = Form(...),
    category: ProductCategory = Form(...),
    price: float = Form(...),
    quantity: int = Form(0),
    description: str | None = Form(None),
    user: User = Depends(require_creator),
):
    with get_db_session() as session:
        slug = _ensure_unique_slug(session, _slugify(name))

        product = Product(
            name=name,
            category=category,
            slug=slug,
            description=description,
            price=price,
            quantity=quantity,
        )
        session.add(product)
        session.commit()
        session.refresh(product)
        # Trigger media load (will be empty for a freshly created product).
        _ = list(product.media)
        return _product_to_response(product)


@shop_router.get("/products", response_model=list[ProductResponse])
def list_products(
    category: ProductCategory | None = Query(None),
    active_only: bool = Query(True),
):
    with get_db_session() as session:
        stmt = (
            select(Product)
            .options(selectinload(Product.media))
            .order_by(
                Product.category,
                Product.created_at.desc(),
            )
        )
        if category:
            stmt = stmt.where(Product.category == category)
        if active_only:
            stmt = stmt.where(Product.is_active == True)

        products = session.execute(stmt).scalars().all()
        return [_product_to_response(p) for p in products]


@shop_router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: str):
    with get_db_session() as session:
        product = _load_product(session, product_id)
        return _product_to_response(product)


@shop_router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    name: str | None = Form(None),
    category: ProductCategory | None = Form(None),
    price: float | None = Form(None),
    quantity: int | None = Form(None),
    description: str | None = Form(None),
    is_active: bool | None = Form(None),
    user: User = Depends(require_creator),
):
    with get_db_session() as session:
        product = _load_product(session, product_id)

        if name is not None:
            product.name = name
            product.slug = _ensure_unique_slug(session, _slugify(name), exclude_id=product.id)
        if category is not None:
            product.category = category
        if price is not None:
            product.price = price
        if quantity is not None:
            product.quantity = quantity
        if description is not None:
            product.description = description
        if is_active is not None:
            product.is_active = is_active

        session.commit()
        session.refresh(product)
        _ = list(product.media)
        return _product_to_response(product)


@shop_router.delete("/products/{product_id}", response_model=ResponseMessage)
def delete_product(
    product_id: str,
    user: User = Depends(require_creator),
):
    """Hard-delete a product and all of its media.

    Removes the ``product`` row (cascading to ``product_media``) and best-effort
    deletes the underlying files from object storage. Refuses to delete if any
    ``order_item`` rows reference the product so historical orders stay intact;
    callers should deactivate such products instead.
    """
    with get_db_session() as session:
        product = _load_product(session, product_id)

        order_item_count = session.execute(
            select(func.count())
            .select_from(OrderItem)
            .where(OrderItem.product_id == product.id)
        ).scalar() or 0
        if order_item_count > 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Product is referenced by existing orders and cannot be "
                    "fully deleted. Deactivate it instead."
                ),
            )

        media_urls = [m.url for m in product.media if m.url]
        session.delete(product)
        session.commit()

    for url in media_urls:
        if "supabase.co" in url:
            storage_service.delete_object(url)

    return ResponseMessage(message="Product deleted")


# ---------------------------------------------------------------------------
# Product media
# ---------------------------------------------------------------------------

def _classify_extension(filename: str) -> tuple[str, ProductMediaType]:
    """Return (extension, media_type) for a supported file, or 400."""
    ext = Path(filename).suffix.lower()
    if ext in ALLOWED_IMAGE_EXTENSIONS:
        return ext, ProductMediaType.IMAGE
    if ext in ALLOWED_VIDEO_EXTENSIONS:
        return ext, ProductMediaType.VIDEO
    allowed = sorted(ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS)
    raise HTTPException(
        status_code=400,
        detail=f"Unsupported media type. Allowed: {', '.join(allowed)}",
    )


def _clear_other_featured(
    session: Session, product_id: uuid.UUID, keep_id: uuid.UUID | None
) -> None:
    """Set is_featured=False on every other media row for the product."""
    others_stmt = select(ProductMedia).where(
        ProductMedia.product_id == product_id,
        ProductMedia.is_featured == True,
    )
    if keep_id is not None:
        others_stmt = others_stmt.where(ProductMedia.id != keep_id)
    for other in session.execute(others_stmt).scalars().all():
        other.is_featured = False


@shop_router.post(
    "/products/{product_id}/media",
    response_model=ProductMediaResponse,
)
async def upload_product_media(
    product_id: str,
    file: UploadFile = File(...),
    is_featured: bool = Form(False),
    display_order: int | None = Form(None),
    user: User = Depends(require_creator),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    ext, media_type = _classify_extension(file.filename)
    contents = await file.read()

    if media_type == ProductMediaType.VIDEO and len(contents) > MAX_VIDEO_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Video exceeds the {MAX_VIDEO_BYTES // (1024 * 1024)} MB limit",
        )

    if media_type == ProductMediaType.IMAGE:
        url = storage_service.upload_image(contents, "shop/products", ext)
    else:
        url = storage_service.upload_video(contents, "shop/products", ext)

    with get_db_session() as session:
        product = _load_product(session, product_id)

        if display_order is None:
            current_max = session.execute(
                select(func.max(ProductMedia.display_order)).where(
                    ProductMedia.product_id == product.id
                )
            ).scalar()
            order_val = (current_max + 1) if current_max is not None else 0
        else:
            order_val = display_order

        media = ProductMedia(
            product_id=product.id,
            url=url,
            media_type=media_type,
            display_order=order_val,
            is_featured=False,
        )
        session.add(media)
        session.flush()

        if is_featured:
            _clear_other_featured(session, product.id, keep_id=media.id)
            media.is_featured = True

        session.commit()
        session.refresh(media)
        return _media_to_response(media)


@shop_router.patch(
    "/products/{product_id}/media/{media_id}",
    response_model=ProductMediaResponse,
)
def update_product_media(
    product_id: str,
    media_id: str,
    body: ProductMediaUpdate,
    user: User = Depends(require_creator),
):
    with get_db_session() as session:
        media = session.execute(
            select(ProductMedia).where(
                ProductMedia.id == uuid.UUID(media_id),
                ProductMedia.product_id == uuid.UUID(product_id),
            )
        ).scalar_one_or_none()
        if not media:
            raise HTTPException(status_code=404, detail="Media not found")

        if body.display_order is not None:
            media.display_order = body.display_order

        if body.is_featured is not None:
            if body.is_featured:
                _clear_other_featured(session, media.product_id, keep_id=media.id)
                media.is_featured = True
            else:
                media.is_featured = False

        session.commit()
        session.refresh(media)
        return _media_to_response(media)


@shop_router.delete(
    "/products/{product_id}/media/{media_id}",
    response_model=ResponseMessage,
)
def delete_product_media(
    product_id: str,
    media_id: str,
    user: User = Depends(require_creator),
):
    with get_db_session() as session:
        media = session.execute(
            select(ProductMedia).where(
                ProductMedia.id == uuid.UUID(media_id),
                ProductMedia.product_id == uuid.UUID(product_id),
            )
        ).scalar_one_or_none()
        if not media:
            raise HTTPException(status_code=404, detail="Media not found")

        url = media.url
        session.delete(media)
        session.commit()

    if url and "supabase.co" in url:
        storage_service.delete_object(url)

    return ResponseMessage(message="Media deleted")


@shop_router.put(
    "/products/{product_id}/media/order",
    response_model=list[ProductMediaResponse],
)
def reorder_product_media(
    product_id: str,
    body: ProductMediaReorderRequest,
    user: User = Depends(require_creator),
):
    with get_db_session() as session:
        product = _load_product(session, product_id)

        media_by_id = {m.id: m for m in product.media}
        for entry in body.order:
            mid = uuid.UUID(entry.id)
            if mid not in media_by_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Media {entry.id} does not belong to this product",
                )
            media_by_id[mid].display_order = entry.display_order

        session.commit()
        session.refresh(product)
        return [_media_to_response(m) for m in product.media]


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

def _parse_order_uuid(order_id: str) -> uuid.UUID:
    """Parse an order id from a path param. Anything malformed becomes a 404
    so admins/customers don't accidentally probe enumeration via 422 errors."""
    try:
        return uuid.UUID(order_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Order not found")


def _order_to_summary(order: Order, item_count: int) -> OrderSummary:
    return OrderSummary(
        id=str(order.id),
        status=order.status.value,
        customer_first_name=order.customer_first_name,
        customer_last_name=order.customer_last_name,
        customer_email=order.customer_email,
        customer_discord_handle=order.customer_discord_handle,
        total_amount=float(order.total_amount),
        item_count=item_count,
        tracking_number=order.tracking_number,
        created_at=order.created_at,
    )


def _order_to_detail(
    order: Order,
    items: list[OrderItem],
    product_map: dict[uuid.UUID, Product],
    customizations_by_item: dict[uuid.UUID, list[OrderCustomization]] | None = None,
) -> OrderDetail:
    custom_map = customizations_by_item or {}
    return OrderDetail(
        id=str(order.id),
        status=order.status.value,
        customer_first_name=order.customer_first_name,
        customer_last_name=order.customer_last_name,
        customer_email=order.customer_email,
        customer_discord_handle=order.customer_discord_handle,
        shipping_street=order.shipping_street,
        shipping_city=order.shipping_city,
        shipping_state=order.shipping_state,
        shipping_zip=order.shipping_zip,
        shipping_country=order.shipping_country,
        shipping_method=order.shipping_method.value if order.shipping_method else None,
        shipping_cost=float(order.shipping_cost or 0),
        discount_amount=float(order.discount_amount or 0),
        total_amount=float(order.total_amount),
        items=[
            OrderItemResponse(
                product_id=str(item.product_id),
                product_name=(
                    product_map[item.product_id].name
                    if item.product_id in product_map
                    else "Unknown product"
                ),
                quantity=item.quantity,
                unit_price=float(item.unit_price),
                line_total=float(item.unit_price) * item.quantity,
                customizations=[
                    OrderCustomizationResponse(
                        id=str(c.id),
                        product_id=str(item.product_id),
                        card_name=c.card_name,
                        description=c.description,
                        is_complete=c.is_complete,
                        image_url=c.image_url,
                        completed_at=c.completed_at,
                    )
                    for c in custom_map.get(item.id, [])
                ],
            )
            for item in items
        ],
        tracking_number=order.tracking_number,
        tracking_carrier=order.tracking_carrier,
        tracking_url=order.tracking_url,
        notes=order.notes,
        shipped_at=order.shipped_at,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


def _load_customizations_for_items(
    session: Session, item_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[OrderCustomization]]:
    if not item_ids:
        return {}
    rows = session.execute(
        select(OrderCustomization)
        .where(OrderCustomization.order_item_id.in_(item_ids))
        .order_by(OrderCustomization.created_at)
    ).scalars().all()
    grouped: dict[uuid.UUID, list[OrderCustomization]] = {}
    for c in rows:
        grouped.setdefault(c.order_item_id, []).append(c)
    return grouped


def _persist_customizations(
    session: Session,
    order: Order,
    items_by_product_id: dict[uuid.UUID, OrderItem],
    product_by_id: dict[uuid.UUID, Product],
    customizations,
) -> None:
    """Validate the customization payload and insert ``OrderCustomization``
    rows linked to their parent ``OrderItem``.

    Rules:
    - Every ``CUSTOM``-category product in the cart must have a number of
      customizations equal to its ``OrderItem.quantity`` (each click of "+"
      adds 1 unit and produces 1 customization).
    - Customizations cannot reference a product that's missing from the cart
      or one that isn't ``CUSTOM`` category.
    - ``card_name`` and ``description`` must be non-empty after trimming.
    """
    grouped: dict[uuid.UUID, list[tuple[str, str]]] = {}
    for c in customizations or []:
        try:
            pid = uuid.UUID(c.product_id)
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=400, detail="Invalid customization product_id"
            )
        product = product_by_id.get(pid)
        if not product or pid not in items_by_product_id:
            raise HTTPException(
                status_code=400,
                detail="Customization references a product not in the cart",
            )
        if product.category != ProductCategory.CUSTOM:
            raise HTTPException(
                status_code=400,
                detail=f"Product '{product.name}' does not accept customizations",
            )
        card_name = (c.card_name or "").strip()
        description = (c.description or "").strip()
        if not card_name:
            raise HTTPException(
                status_code=400, detail="Customization card name is required"
            )
        if not description:
            raise HTTPException(
                status_code=400,
                detail="Customization description is required",
            )
        if len(card_name) > 200:
            raise HTTPException(
                status_code=400, detail="Customization card name is too long"
            )
        grouped.setdefault(pid, []).append((card_name, description))

    for pid, item in items_by_product_id.items():
        product = product_by_id.get(pid)
        if product and product.category == ProductCategory.CUSTOM:
            provided = grouped.get(pid, [])
            if len(provided) != item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Expected {item.quantity} customization(s) for "
                        f"'{product.name}', got {len(provided)}"
                    ),
                )

    for pid, custs in grouped.items():
        item = items_by_product_id[pid]
        for card_name, description in custs:
            session.add(
                OrderCustomization(
                    order_id=order.id,
                    order_item_id=item.id,
                    card_name=card_name,
                    description=description,
                )
            )


@shop_router.get("/orders", response_model=list[OrderSummary])
def list_orders(
    status: OrderStatus | None = Query(None),
    user: User = Depends(require_creator),
):
    """List every order for admin fulfillment. Newest first."""
    with get_db_session() as session:
        stmt = select(Order).order_by(Order.created_at.desc())
        if status is not None:
            stmt = stmt.where(Order.status == status)

        orders = session.execute(stmt).scalars().all()
        if not orders:
            return []

        order_ids = [o.id for o in orders]
        count_rows = session.execute(
            select(OrderItem.order_id, func.count(OrderItem.id))
            .where(OrderItem.order_id.in_(order_ids))
            .group_by(OrderItem.order_id)
        ).all()
        count_map = {row[0]: row[1] for row in count_rows}

        return [_order_to_summary(o, count_map.get(o.id, 0)) for o in orders]


@shop_router.get("/orders/{order_id}", response_model=OrderDetail)
def get_order(order_id: str):
    """Return a single order by its internal UUID.

    Public endpoint: the UUID itself acts as an unguessable bearer token so the
    customer can view their order from a link in the receipt email. We never
    expose a list/search variant of this, so enumeration would require guessing
    a v4 UUID.
    """
    order_uuid = _parse_order_uuid(order_id)
    with get_db_session() as session:
        order = session.execute(
            select(Order).where(Order.id == order_uuid)
        ).scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        items = session.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        ).scalars().all()

        product_ids = {item.product_id for item in items}
        product_map: dict[uuid.UUID, Product] = {}
        if product_ids:
            products = session.execute(
                select(Product).where(Product.id.in_(product_ids))
            ).scalars().all()
            product_map = {p.id: p for p in products}

        custom_map = _load_customizations_for_items(
            session, [item.id for item in items]
        )
        return _order_to_detail(order, items, product_map, custom_map)


@shop_router.patch("/orders/{order_id}", response_model=OrderDetail)
def update_order(
    order_id: str,
    body: OrderUpdateRequest,
    user: User = Depends(require_creator),
):
    """Admin update for status and shipping/tracking fields."""
    order_uuid = _parse_order_uuid(order_id)
    with get_db_session() as session:
        order = session.execute(
            select(Order).where(Order.id == order_uuid)
        ).scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if body.status is not None:
            order.status = body.status
            # Auto-stamp shipped_at the first time the order moves to SHIPPED so
            # admins don't have to fill it in manually. Explicit shipped_at in
            # the same payload still wins (handled below).
            if body.status == OrderStatus.SHIPPED and order.shipped_at is None:
                order.shipped_at = datetime.utcnow()

        if body.tracking_number is not None:
            order.tracking_number = body.tracking_number or None
        if body.tracking_carrier is not None:
            order.tracking_carrier = body.tracking_carrier or None
        if body.tracking_url is not None:
            order.tracking_url = body.tracking_url or None
        if body.notes is not None:
            order.notes = body.notes or None
        if body.shipped_at is not None:
            order.shipped_at = body.shipped_at

        session.commit()
        session.refresh(order)

        items = session.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        ).scalars().all()

        product_ids = {item.product_id for item in items}
        product_map: dict[uuid.UUID, Product] = {}
        if product_ids:
            products = session.execute(
                select(Product).where(Product.id.in_(product_ids))
            ).scalars().all()
            product_map = {p.id: p for p in products}

        custom_map = _load_customizations_for_items(
            session, [item.id for item in items]
        )
        return _order_to_detail(order, items, product_map, custom_map)


@shop_router.post("/orders/create", response_model=OrderCreateResponse)
async def create_order(request: OrderCreateRequest):
    if not request.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    cust = request.customer
    if cust.shipping_method is None:
        raise HTTPException(status_code=400, detail="Shipping method is required")

    product_ids = [uuid.UUID(item.product_id) for item in request.items]
    qty_map = {uuid.UUID(item.product_id): item.quantity for item in request.items}

    with get_db_session() as session:
        products = session.execute(
            select(Product).where(Product.id.in_(product_ids))
        ).scalars().all()

        if len(products) != len(product_ids):
            raise HTTPException(status_code=400, detail="One or more products not found")

        item_subtotal = 0.0

        for product in products:
            requested_qty = qty_map[product.id]

            if not product.is_active:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product '{product.name}' is no longer available",
                )
            if product.quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"'{product.name}' is out of stock",
                )
            if product.quantity < requested_qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough stock for '{product.name}' (available: {product.quantity})",
                )

            item_subtotal += float(product.price) * requested_qty

        shipping_cost, discount_amount = _compute_shipping_and_discount(
            cust.shipping_method,
            cust.shipping_state,
            list(products),
            qty_map,
        )
        total = max(0.0, item_subtotal + shipping_cost - discount_amount)

        full_name = f"{cust.first_name} {cust.last_name}".strip()
        shipping = {
            "name": {"full_name": full_name},
            "address": {
                "address_line_1": cust.shipping_street,
                "admin_area_2": cust.shipping_city,
                "admin_area_1": cust.shipping_state,
                "postal_code": cust.shipping_zip,
                "country_code": cust.shipping_country,
            },
        }

        paypal_order_id = await paypal_service.create_order(
            total=f"{total:.2f}",
            currency="USD",
            shipping=shipping,
        )

        order = Order(
            paypal_order_id=paypal_order_id,
            status=OrderStatus.PENDING,
            customer_first_name=cust.first_name,
            customer_last_name=cust.last_name,
            customer_email=cust.email,
            customer_discord_handle=cust.discord_handle,
            shipping_street=cust.shipping_street,
            shipping_city=cust.shipping_city,
            shipping_state=cust.shipping_state,
            shipping_zip=cust.shipping_zip,
            shipping_country=cust.shipping_country,
            shipping_method=cust.shipping_method,
            shipping_cost=shipping_cost,
            discount_amount=discount_amount,
            notes=(cust.notes or None),
            total_amount=total,
        )
        session.add(order)
        session.flush()

        items_by_product_id: dict[uuid.UUID, OrderItem] = {}
        for product in products:
            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=qty_map[product.id],
                unit_price=float(product.price),
            )
            session.add(order_item)
            items_by_product_id[product.id] = order_item
        session.flush()

        product_by_id = {p.id: p for p in products}
        _persist_customizations(
            session,
            order,
            items_by_product_id,
            product_by_id,
            request.customizations,
        )

        session.commit()

        return OrderCreateResponse(
            order_id=str(order.id),
            paypal_order_id=paypal_order_id,
        )


@shop_router.post("/orders/{paypal_order_id}/capture", response_model=OrderCaptureResponse)
async def capture_order(paypal_order_id: str):
    with get_db_session() as session:
        order = session.execute(
            select(Order).where(Order.paypal_order_id == paypal_order_id)
        ).scalar_one_or_none()

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status != OrderStatus.PENDING:
            raise HTTPException(status_code=400, detail="Order is not in pending state")

        try:
            capture_data = await paypal_service.capture_order(paypal_order_id)
        except Exception as e:
            logger.error("PayPal capture failed for %s: %s", paypal_order_id, e)
            order.status = OrderStatus.FAILED
            session.commit()
            raise HTTPException(status_code=502, detail="Payment capture failed")

        if capture_data.get("status") != "COMPLETED":
            order.status = OrderStatus.FAILED
            session.commit()
            raise HTTPException(status_code=400, detail="Payment was not completed")

        items = session.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        ).scalars().all()

        product_ids = [item.product_id for item in items]
        products = session.execute(
            select(Product).where(Product.id.in_(product_ids)).with_for_update()
        ).scalars().all()
        product_map = {p.id: p for p in products}

        for item in items:
            product = product_map.get(item.product_id)
            if not product or product.quantity < item.quantity:
                order.status = OrderStatus.FAILED
                session.commit()
                raise HTTPException(
                    status_code=409,
                    detail="Stock changed during payment — contact support",
                )
            product.quantity -= item.quantity

        order.status = OrderStatus.PAID
        session.commit()

        try:
            order_url = (
                f"{FRONTEND_URL.rstrip('/')}/shop/orders/{order.id}"
                if FRONTEND_URL
                else None
            )
            shipping_cost = float(order.shipping_cost or 0)
            discount_amount = float(order.discount_amount or 0)
            item_subtotal = sum(
                float(item.unit_price) * item.quantity for item in items
            )
            email_ctx = OrderEmailContext(
                order_id_short=str(order.id)[:8],
                customer_first_name=order.customer_first_name,
                customer_last_name=order.customer_last_name,
                customer_email=order.customer_email,
                customer_discord_handle=order.customer_discord_handle,
                total_amount=float(order.total_amount),
                shipping_address_lines=[
                    order.shipping_street,
                    f"{order.shipping_city}, {order.shipping_state} {order.shipping_zip}",
                    order.shipping_country,
                ],
                items=[
                    OrderEmailLineItem(
                        name=product_map[item.product_id].name,
                        quantity=item.quantity,
                        unit_price=float(item.unit_price),
                        line_total=float(item.unit_price) * item.quantity,
                    )
                    for item in items
                ],
                order_url=order_url,
                shipping_method_label=_shipping_method_label(order.shipping_method),
                item_subtotal=item_subtotal,
                shipping_cost=shipping_cost,
                discount_amount=discount_amount,
            )

            if order.customer_email:
                send_order_receipt_email(order.customer_email, email_ctx)

            admin_email = SHOP_ADMIN_EMAIL
            if not admin_email:
                creator = session.execute(
                    select(User).where(func.lower(User.username) == "rosie")
                ).scalar_one_or_none()
                if creator and creator.email:
                    admin_email = creator.email
            if admin_email:
                send_order_admin_notification_email(admin_email, email_ctx)
            else:
                logger.warning(
                    "No admin email configured (set SHOP_ADMIN_EMAIL); "
                    "skipping admin notification for order %s",
                    order.id,
                )
        except Exception:
            logger.warning(
                "Failed to dispatch order confirmation emails for order %s",
                order.id,
                exc_info=True,
            )

        return OrderCaptureResponse(
            order_id=str(order.id),
            status="paid",
            message="Payment successful, order confirmed",
        )


@shop_router.post("/orders/custom", response_model=OrderDetail)
def create_custom_order(
    request: OrderCreateRequest,
    user: User = Depends(require_creator),
):
    """Admin-only: record an in-person/cash order without PayPal.

    Validates products and stock the same way the public checkout does, then
    persists the order with ``status=IN_PERSON`` and decrements product stock
    in a single transaction. The same receipt + admin notification emails as
    the paid flow are dispatched (best-effort) so the customer still gets a
    confirmation when they provided an email.
    """
    if not request.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    product_ids = [uuid.UUID(item.product_id) for item in request.items]
    qty_map = {uuid.UUID(item.product_id): item.quantity for item in request.items}

    with get_db_session() as session:
        products = session.execute(
            select(Product).where(Product.id.in_(product_ids)).with_for_update()
        ).scalars().all()

        if len(products) != len(product_ids):
            raise HTTPException(status_code=400, detail="One or more products not found")

        total = 0.0
        for product in products:
            requested_qty = qty_map[product.id]

            if not product.is_active:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product '{product.name}' is no longer available",
                )
            if product.quantity < requested_qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough stock for '{product.name}' (available: {product.quantity})",
                )

            total += float(product.price) * requested_qty

        cust = request.customer
        order = Order(
            paypal_order_id=None,
            status=OrderStatus.IN_PERSON,
            customer_first_name=cust.first_name,
            customer_last_name=cust.last_name,
            customer_email=cust.email,
            customer_discord_handle=cust.discord_handle,
            shipping_street=cust.shipping_street,
            shipping_city=cust.shipping_city,
            shipping_state=cust.shipping_state,
            shipping_zip=cust.shipping_zip,
            shipping_country=cust.shipping_country,
            notes=(cust.notes or None),
            total_amount=total,
        )
        session.add(order)
        session.flush()

        product_map = {p.id: p for p in products}
        items: list[OrderItem] = []
        items_by_product_id: dict[uuid.UUID, OrderItem] = {}
        for product in products:
            qty = qty_map[product.id]
            item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=qty,
                unit_price=float(product.price),
            )
            session.add(item)
            items.append(item)
            items_by_product_id[product.id] = item
            product.quantity -= qty
        session.flush()

        _persist_customizations(
            session,
            order,
            items_by_product_id,
            product_map,
            request.customizations,
        )

        session.commit()
        session.refresh(order)

        try:
            order_url = (
                f"{FRONTEND_URL.rstrip('/')}/shop/orders/{order.id}"
                if FRONTEND_URL
                else None
            )
            email_ctx = OrderEmailContext(
                order_id_short=str(order.id)[:8],
                customer_first_name=order.customer_first_name,
                customer_last_name=order.customer_last_name,
                customer_email=order.customer_email,
                customer_discord_handle=order.customer_discord_handle,
                total_amount=float(order.total_amount),
                shipping_address_lines=[
                    order.shipping_street,
                    f"{order.shipping_city}, {order.shipping_state} {order.shipping_zip}",
                    order.shipping_country,
                ],
                items=[
                    OrderEmailLineItem(
                        name=product_map[item.product_id].name,
                        quantity=item.quantity,
                        unit_price=float(item.unit_price),
                        line_total=float(item.unit_price) * item.quantity,
                    )
                    for item in items
                ],
                order_url=order_url,
            )

            if order.customer_email:
                send_order_receipt_email(order.customer_email, email_ctx)

            admin_email = SHOP_ADMIN_EMAIL
            if not admin_email:
                creator = session.execute(
                    select(User).where(func.lower(User.username) == "rosie")
                ).scalar_one_or_none()
                if creator and creator.email:
                    admin_email = creator.email
            if admin_email:
                send_order_admin_notification_email(admin_email, email_ctx)
        except Exception:
            logger.warning(
                "Failed to dispatch custom-order confirmation emails for order %s",
                order.id,
                exc_info=True,
            )

        items_for_response = session.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        ).scalars().all()
        custom_map = _load_customizations_for_items(
            session, [i.id for i in items_for_response]
        )
        return _order_to_detail(
            order, items_for_response, product_map, custom_map
        )


# ---------------------------------------------------------------------------
# Custom-card-art queue
# ---------------------------------------------------------------------------

def _customization_to_queue_row(
    customization: OrderCustomization,
    order: Order,
    product_name: str,
    order_total_quantity: int,
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
        product_name=product_name,
        order_total_quantity=order_total_quantity,
    )


def _orderitem_to_queue_row(
    item: OrderItem,
    order: Order,
    product_name: str,
    order_total_quantity: int,
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
        product_name=product_name,
        order_total_quantity=order_total_quantity,
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


@shop_router.get("/customizations", response_model=list[CustomizationQueueRow])
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
                            c, order, product.name, total_qty
                        )
                    )
            else:
                result.append(
                    _orderitem_to_queue_row(
                        item, order, product.name, total_qty
                    )
                )

        # Stable sort: to-do first, then oldest order first.
        result.sort(key=lambda r: (r.is_complete, r.order_created_at))
        return result


@shop_router.get("/waitlist", response_model=list[WaitlistEntry])
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


@shop_router.patch(
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

        session.commit()
        session.refresh(customization)
        total_qty = _sum_order_quantity(session, order.id)
        return _customization_to_queue_row(
            customization, order, product.name, total_qty
        )


@shop_router.post(
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
            customization, order, product.name, total_qty
        )

    if previous_url and previous_url != new_url and "supabase.co" in previous_url:
        storage_service.delete_object(previous_url)

    return response


@shop_router.delete(
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
            customization, order, product.name, total_qty
        )

    if previous_url and "supabase.co" in previous_url:
        storage_service.delete_object(previous_url)

    return response


@shop_router.patch(
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
        return _orderitem_to_queue_row(item, order, product.name, total_qty)


# ---------------------------------------------------------------------------
# Contact
# ---------------------------------------------------------------------------

@shop_router.post("/contact", response_model=ResponseMessage)
def submit_contact(body: ContactRequest):
    """Public endpoint: send a contact message to the shop admin."""
    admin_email = SHOP_ADMIN_EMAIL
    if not admin_email:
        with get_db_session() as session:
            creator = session.execute(
                select(User).where(func.lower(User.username) == "rosie")
            ).scalar_one_or_none()
            if creator and creator.email:
                admin_email = creator.email

    if not admin_email:
        logger.warning(
            "No admin email configured (set SHOP_ADMIN_EMAIL); "
            "dropping contact message from %s",
            body.email,
        )
        return ResponseMessage(message="Message sent")

    send_contact_email(admin_email, body.name, body.email, body.message)
    return ResponseMessage(message="Message sent")
