import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from streampage.api.middleware.authenticator import require_creator
from streampage.api.shop.common import (
    shipping_method_label,
    compute_shipping_and_discount,
)
from streampage.config import FRONTEND_URL, SHOP_ADMIN_EMAIL
from streampage.api.shop.models import (
    OrderCreateRequest,
    OrderCreateResponse,
    OrderStripeIntentResponse,
    OrderCaptureResponse,
    OrderCustomizationResponse,
    OrderDetail,
    OrderItemResponse,
    OrderSummary,
    OrderUpdateRequest,
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
from streampage.services.email import (
    OrderEmailContext,
    OrderEmailLineItem,
    send_order_admin_notification_email,
    send_order_receipt_email,
)
from streampage.services.paypal import paypal_service
from streampage.services.stripe import stripe_service


logger = logging.getLogger(__name__)

orders_router = APIRouter()


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
        payment_provider=order.payment_provider,
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


def _validate_customizations(
    qty_by_product_id: dict[uuid.UUID, int],
    product_by_id: dict[uuid.UUID, Product],
    customizations,
) -> dict[uuid.UUID, list[tuple[str, str]]]:
    """Validate the customization payload against the cart.

    Returns a ``{product_id: [(card_name, description), ...]}`` mapping that
    :func:`_insert_customizations` can consume directly. This function does
    not touch the database, so it's safe to call before a payment has been
    captured.

    Rules:
    - Every ``CUSTOM``-category product in the cart must have a number of
      customizations equal to its requested quantity (each click of "+"
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
        if not product or pid not in qty_by_product_id:
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

    for pid, qty in qty_by_product_id.items():
        product = product_by_id.get(pid)
        if product and product.category == ProductCategory.CUSTOM:
            provided = grouped.get(pid, [])
            if len(provided) != qty:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Expected {qty} customization(s) for "
                        f"'{product.name}', got {len(provided)}"
                    ),
                )

    return grouped


def _insert_customizations(
    session: Session,
    order: Order,
    items_by_product_id: dict[uuid.UUID, OrderItem],
    grouped: dict[uuid.UUID, list[tuple[str, str]]],
) -> None:
    """Insert ``OrderCustomization`` rows for a validated grouping."""
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


@orders_router.get("/orders", response_model=list[OrderSummary])
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


@orders_router.get("/orders/{order_id}", response_model=OrderDetail)
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


@orders_router.patch("/orders/{order_id}", response_model=OrderDetail)
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


def _validate_checkout_request(
    session: Session,
    request: OrderCreateRequest,
) -> tuple[
    list[Product],
    dict[uuid.UUID, int],
    dict[uuid.UUID, list[tuple[str, str]]],
    float,
    float,
    float,
    float,
]:
    """Validate cart + customer + customizations against current product data.

    Used by both ``create_order`` (pre-PayPal) and ``capture_order``
    (post-PayPal, before persisting). Returns the loaded products, quantity
    map, validated customization grouping, item subtotal, shipping cost,
    discount amount, and total.

    Raises ``HTTPException`` on any validation failure. Does not lock rows;
    capture re-runs stock validation under a ``FOR UPDATE`` lock right
    before decrementing.
    """
    if not request.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    cust = request.customer
    if cust.shipping_method is None:
        raise HTTPException(status_code=400, detail="Shipping method is required")

    product_ids = [uuid.UUID(item.product_id) for item in request.items]
    qty_map = {uuid.UUID(item.product_id): item.quantity for item in request.items}

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

    shipping_cost, discount_amount = compute_shipping_and_discount(
        cust.shipping_method,
        cust.shipping_state,
        cust.shipping_country,
        item_subtotal,
    )
    total = max(0.0, item_subtotal + shipping_cost - discount_amount)

    product_by_id = {p.id: p for p in products}
    grouped_customizations = _validate_customizations(
        qty_map, product_by_id, request.customizations
    )

    return (
        list(products),
        qty_map,
        grouped_customizations,
        item_subtotal,
        shipping_cost,
        discount_amount,
        total,
    )


@orders_router.post("/orders/create", response_model=OrderCreateResponse)
async def create_order(request: OrderCreateRequest):
    """Validate the cart and create a PayPal order. No DB rows are written.

    The order is only persisted after the user approves the payment and the
    frontend re-sends the cart payload to :func:`capture_order`, which then
    captures the PayPal payment and inserts the ``Order`` row in a single
    transaction. This avoids leaving abandoned ``pending`` orders in the DB.
    """
    with get_db_session() as session:
        (
            _products,
            _qty_map,
            _grouped,
            _item_subtotal,
            _shipping_cost,
            _discount_amount,
            total,
        ) = _validate_checkout_request(session, request)

    cust = request.customer
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

    return OrderCreateResponse(paypal_order_id=paypal_order_id)


def _write_orphan_paid_order(
    request: OrderCreateRequest,
    *,
    provider: str,
    total: float,
    shipping_cost: float,
    discount_amount: float,
    reason: str,
    paypal_order_id: str | None = None,
    stripe_payment_intent_id: str | None = None,
) -> str | None:
    """Write a minimal ``Order(status=FAILED)`` row when a payment succeeded
    with the provider but the main DB transaction could not persist the full
    order.

    This is the failsafe that guarantees every successful charge has *some*
    DB record an admin can find. Best-effort: returns the new order id on
    success, ``None`` if even this insert fails (in which case the error is
    logged and the admin will have to reconcile via the provider dashboard
    alone).
    """
    cust = request.customer
    payment_ref = paypal_order_id or stripe_payment_intent_id
    try:
        with get_db_session() as session:
            if stripe_payment_intent_id is not None:
                existing = session.execute(
                    select(Order).where(
                        Order.stripe_payment_intent_id == stripe_payment_intent_id
                    )
                ).scalar_one_or_none()
            else:
                existing = session.execute(
                    select(Order).where(Order.paypal_order_id == paypal_order_id)
                ).scalar_one_or_none()
            if existing is not None:
                return str(existing.id)

            orphan = Order(
                paypal_order_id=paypal_order_id,
                stripe_payment_intent_id=stripe_payment_intent_id,
                payment_provider=provider,
                status=OrderStatus.FAILED,
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
                notes=(
                    f"AUTO: {provider} payment succeeded but order persist failed "
                    f"({reason}). Payment ref: {payment_ref}. "
                    f"Reconcile manually."
                ),
                total_amount=total,
            )
            session.add(orphan)
            session.commit()
            session.refresh(orphan)
            return str(orphan.id)
    except Exception:
        logger.exception(
            "Failed to write orphan-paid row for %s payment %s",
            provider,
            payment_ref,
        )
        return None


def _persist_paid_order(
    request: OrderCreateRequest,
    *,
    provider: str,
    grouped_customizations,
    shipping_cost: float,
    discount_amount: float,
    total: float,
    paypal_order_id: str | None = None,
    stripe_payment_intent_id: str | None = None,
) -> OrderCaptureResponse:
    """Persist a paid order (status=PAID) in a single transaction and send
    receipt/admin emails. Idempotent on the provider's payment id.

    Assumes the payment has already been captured/confirmed with the
    provider. Shared by the PayPal capture and Stripe finalize endpoints.

    In one transaction: lock product rows, re-check stock, decrement, insert
    ``Order(status=PAID)`` + items + customizations, then best-effort send
    the receipt + admin emails. If persistence raises after the payment
    succeeded, a minimal ``Order(status=FAILED)`` row is written so admins
    can always reconcile a real charge, and the error is re-raised.
    """
    cust = request.customer
    payment_ref = paypal_order_id or stripe_payment_intent_id
    try:
        with get_db_session() as session:
            if stripe_payment_intent_id is not None:
                existing = session.execute(
                    select(Order).where(
                        Order.stripe_payment_intent_id == stripe_payment_intent_id
                    )
                ).scalar_one_or_none()
            else:
                existing = session.execute(
                    select(Order).where(Order.paypal_order_id == paypal_order_id)
                ).scalar_one_or_none()
            if existing is not None:
                return OrderCaptureResponse(
                    order_id=str(existing.id),
                    status=existing.status.value,
                    message="Order already recorded",
                )

            product_ids = list({uuid.UUID(item.product_id) for item in request.items})
            qty_map = {
                uuid.UUID(item.product_id): item.quantity for item in request.items
            }
            products = session.execute(
                select(Product).where(Product.id.in_(product_ids)).with_for_update()
            ).scalars().all()
            product_map = {p.id: p for p in products}

            if len(products) != len(product_ids):
                raise HTTPException(
                    status_code=409,
                    detail="Product changed during payment — contact support",
                )

            for pid, qty in qty_map.items():
                product = product_map.get(pid)
                if not product or product.quantity < qty:
                    raise HTTPException(
                        status_code=409,
                        detail="Stock changed during payment — contact support",
                    )
                product.quantity -= qty

            order = Order(
                paypal_order_id=paypal_order_id,
                stripe_payment_intent_id=stripe_payment_intent_id,
                payment_provider=provider,
                status=OrderStatus.PAID,
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
            items_in_order: list[OrderItem] = []
            for product in products:
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    quantity=qty_map[product.id],
                    unit_price=float(product.price),
                )
                session.add(order_item)
                items_by_product_id[product.id] = order_item
                items_in_order.append(order_item)
            session.flush()

            _insert_customizations(
                session,
                order,
                items_by_product_id,
                grouped_customizations,
            )

            session.commit()
            session.refresh(order)
            order_id_str = str(order.id)

            try:
                order_url = (
                    f"{FRONTEND_URL.rstrip('/')}/shop/orders/{order.id}"
                    if FRONTEND_URL
                    else None
                )
                item_subtotal = sum(
                    float(item.unit_price) * item.quantity
                    for item in items_in_order
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
                        for item in items_in_order
                    ],
                    order_url=order_url,
                    shipping_method_label=shipping_method_label(order.shipping_method),
                    item_subtotal=item_subtotal,
                    shipping_cost=float(order.shipping_cost or 0),
                    discount_amount=float(order.discount_amount or 0),
                    order_date=order.created_at,
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
                order_id=order_id_str,
                status="paid",
                message="Payment successful, order confirmed",
            )
    except HTTPException as http_exc:
        orphan_id = _write_orphan_paid_order(
            request,
            provider=provider,
            total=total,
            shipping_cost=shipping_cost,
            discount_amount=discount_amount,
            reason=f"HTTP {http_exc.status_code}: {http_exc.detail}",
            paypal_order_id=paypal_order_id,
            stripe_payment_intent_id=stripe_payment_intent_id,
        )
        logger.error(
            "Order persist failed post-payment for %s %s (orphan row: %s): %s",
            provider,
            payment_ref,
            orphan_id,
            http_exc.detail,
        )
        raise
    except Exception as exc:
        orphan_id = _write_orphan_paid_order(
            request,
            provider=provider,
            total=total,
            shipping_cost=shipping_cost,
            discount_amount=discount_amount,
            reason=f"{type(exc).__name__}: {exc}",
            paypal_order_id=paypal_order_id,
            stripe_payment_intent_id=stripe_payment_intent_id,
        )
        logger.exception(
            "Unexpected error persisting order after %s payment %s (orphan row: %s)",
            provider,
            payment_ref,
            orphan_id,
        )
        raise HTTPException(
            status_code=500,
            detail=(
                "Payment succeeded but the order could not be saved. "
                "Support has been notified — please contact us with your "
                "payment confirmation."
            ),
        )


@orders_router.post("/orders/{paypal_order_id}/capture", response_model=OrderCaptureResponse)
async def capture_order(paypal_order_id: str, request: OrderCreateRequest):
    """Capture a PayPal payment, then persist the order in one transaction.

    The cart, customer info, and customizations are re-sent by the frontend
    so the backend can persist the full order without ever leaving a
    ``pending`` row in the DB. Validation is re-run server-side so a
    tampered re-submission cannot slip past the original ``create`` check.

    Flow:
      1. Validate the resubmitted cart (products, stock, customizations).
      2. Call PayPal capture. If it errors or is not ``COMPLETED``, return
         an error and write nothing to the DB.
      3. Persist the paid order via :func:`_persist_paid_order`.
    """
    with get_db_session() as session:
        (
            _products,
            _qty_map,
            grouped_customizations,
            _item_subtotal,
            shipping_cost,
            discount_amount,
            total,
        ) = _validate_checkout_request(session, request)

    try:
        capture_data = await paypal_service.capture_order(paypal_order_id)
    except Exception as e:
        logger.error("PayPal capture failed for %s: %s", paypal_order_id, e)
        raise HTTPException(status_code=502, detail="Payment capture failed")

    if capture_data.get("status") != "COMPLETED":
        raise HTTPException(status_code=400, detail="Payment was not completed")

    return _persist_paid_order(
        request,
        provider="paypal",
        grouped_customizations=grouped_customizations,
        shipping_cost=shipping_cost,
        discount_amount=discount_amount,
        total=total,
        paypal_order_id=paypal_order_id,
    )


@orders_router.post("/orders/stripe/create-intent", response_model=OrderStripeIntentResponse)
async def create_stripe_intent(request: OrderCreateRequest):
    """Validate the cart and create a Stripe PaymentIntent. No DB rows written.

    Mirrors :func:`create_order` (PayPal). The returned ``client_secret`` is
    used by Stripe.js to confirm the payment on-page; the order is only
    persisted afterwards via :func:`finalize_stripe_order`.
    """
    with get_db_session() as session:
        (
            _products,
            _qty_map,
            _grouped,
            _item_subtotal,
            _shipping_cost,
            _discount_amount,
            total,
        ) = _validate_checkout_request(session, request)

    cust = request.customer
    metadata = {
        "customer_email": cust.email,
        "customer_discord_handle": cust.discord_handle,
        "shipping_country": cust.shipping_country,
    }

    intent = await stripe_service.create_payment_intent(
        total=f"{total:.2f}",
        currency="usd",
        metadata=metadata,
    )

    return OrderStripeIntentResponse(
        payment_intent_id=intent["id"],
        client_secret=intent["client_secret"],
    )


@orders_router.post(
    "/orders/stripe/{payment_intent_id}/finalize",
    response_model=OrderCaptureResponse,
)
async def finalize_stripe_order(payment_intent_id: str, request: OrderCreateRequest):
    """Verify a Stripe payment succeeded, then persist the order.

    Mirrors :func:`capture_order` (PayPal). The cart is re-validated so a
    tampered re-submission cannot slip past the original ``create-intent``
    check, and the PaymentIntent is retrieved from Stripe to confirm it
    actually ``succeeded`` for the expected amount before anything is
    written to the DB.
    """
    with get_db_session() as session:
        (
            _products,
            _qty_map,
            grouped_customizations,
            _item_subtotal,
            shipping_cost,
            discount_amount,
            total,
        ) = _validate_checkout_request(session, request)

    try:
        intent = await stripe_service.retrieve_payment_intent(payment_intent_id)
    except Exception as e:
        logger.error("Stripe retrieve failed for %s: %s", payment_intent_id, e)
        raise HTTPException(status_code=502, detail="Payment verification failed")

    if intent.get("status") != "succeeded":
        raise HTTPException(status_code=400, detail="Payment was not completed")

    expected_cents = int(round(total * 100))
    charged_cents = intent.get("amount_received") or intent.get("amount")
    if not intent.get("test_mode") and charged_cents != expected_cents:
        logger.error(
            "Stripe amount mismatch for %s: charged=%s expected=%s",
            payment_intent_id,
            charged_cents,
            expected_cents,
        )
        raise HTTPException(
            status_code=400,
            detail="Payment amount did not match the order total",
        )

    return _persist_paid_order(
        request,
        provider="stripe",
        grouped_customizations=grouped_customizations,
        shipping_cost=shipping_cost,
        discount_amount=discount_amount,
        total=total,
        stripe_payment_intent_id=payment_intent_id,
    )


@orders_router.post("/orders/custom", response_model=OrderDetail)
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
            payment_provider="in_person",
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
        grouped_customizations = _validate_customizations(
            qty_map, product_map, request.customizations
        )

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

        _insert_customizations(
            session,
            order,
            items_by_product_id,
            grouped_customizations,
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
                order_date=order.created_at,
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
