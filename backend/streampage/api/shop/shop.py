import logging
import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from streampage.api.middleware.authenticator import require_creator
from streampage.api.shop.models import (
    ProductResponse,
    ProductUpdate,
    CartItem,
    CustomerInfo,
    OrderCreateRequest,
    OrderCreateResponse,
    OrderCaptureResponse,
    ResponseMessage,
)
from streampage.db.engine import get_db_session
from streampage.db.enums import ProductCategory, OrderStatus
from streampage.db.models import Product, Order, OrderItem, User
from streampage.services.paypal import paypal_service
from streampage.services.storage import storage_service

logger = logging.getLogger(__name__)

shop_router = APIRouter()

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


def _product_to_response(p: Product) -> ProductResponse:
    return ProductResponse(
        id=str(p.id),
        category=p.category.value,
        name=p.name,
        slug=p.slug,
        description=p.description,
        price=float(p.price),
        quantity=p.quantity,
        image_url=p.image_url,
        is_active=p.is_active,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

@shop_router.post("/products", response_model=ProductResponse)
async def create_product(
    name: str = Form(...),
    category: ProductCategory = Form(...),
    price: float = Form(...),
    quantity: int = Form(0),
    description: str | None = Form(None),
    file: UploadFile | None = File(None),
    user: User = Depends(require_creator),
):
    image_url: str | None = None
    if file and file.filename:
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image type. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
            )
        contents = await file.read()
        image_url = storage_service.upload_image(contents, "shop/products", ext)

    slug = _slugify(name)

    with get_db_session() as session:
        existing = session.execute(
            select(Product).where(Product.slug == slug)
        ).scalar_one_or_none()
        if existing:
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"

        product = Product(
            name=name,
            category=category,
            slug=slug,
            description=description,
            price=price,
            quantity=quantity,
            image_url=image_url,
        )
        session.add(product)
        session.commit()
        session.refresh(product)
        return _product_to_response(product)


@shop_router.get("/products", response_model=list[ProductResponse])
def list_products(
    category: ProductCategory | None = Query(None),
    active_only: bool = Query(True),
):
    with get_db_session() as session:
        stmt = select(Product).order_by(Product.created_at.desc())
        if category:
            stmt = stmt.where(Product.category == category)
        if active_only:
            stmt = stmt.where(Product.is_active == True)

        products = session.execute(stmt).scalars().all()
        return [_product_to_response(p) for p in products]


@shop_router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: str):
    with get_db_session() as session:
        product = session.execute(
            select(Product).where(Product.id == uuid.UUID(product_id))
        ).scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
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
    file: UploadFile | None = File(None),
    user: User = Depends(require_creator),
):
    with get_db_session() as session:
        product = session.execute(
            select(Product).where(Product.id == uuid.UUID(product_id))
        ).scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        if name is not None:
            product.name = name
            product.slug = _slugify(name)
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

        if file and file.filename:
            ext = Path(file.filename).suffix.lower()
            if ext not in ALLOWED_IMAGE_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid image type. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
                )
            contents = await file.read()

            if product.image_url and "supabase.co" in product.image_url:
                storage_service.delete_image(product.image_url)

            product.image_url = storage_service.upload_image(contents, "shop/products", ext)

        session.commit()
        session.refresh(product)
        return _product_to_response(product)


@shop_router.delete("/products/{product_id}", response_model=ResponseMessage)
def delete_product(
    product_id: str,
    user: User = Depends(require_creator),
):
    with get_db_session() as session:
        product = session.execute(
            select(Product).where(Product.id == uuid.UUID(product_id))
        ).scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        product.is_active = False
        session.commit()

    return ResponseMessage(message="Product deactivated")


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

@shop_router.post("/orders/create", response_model=OrderCreateResponse)
async def create_order(request: OrderCreateRequest):
    if not request.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    product_ids = [uuid.UUID(item.product_id) for item in request.items]
    qty_map = {uuid.UUID(item.product_id): item.quantity for item in request.items}

    with get_db_session() as session:
        products = session.execute(
            select(Product).where(Product.id.in_(product_ids))
        ).scalars().all()

        if len(products) != len(product_ids):
            raise HTTPException(status_code=400, detail="One or more products not found")

        paypal_items: list[dict] = []
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

            line_total = float(product.price) * requested_qty
            total += line_total

            paypal_items.append({
                "name": product.name,
                "unit_amount": {"currency_code": "USD", "value": f"{float(product.price):.2f}"},
                "quantity": str(requested_qty),
            })

        cust = request.customer
        shipping = {
            "name": {"full_name": cust.name},
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
            items=paypal_items,
            shipping=shipping,
        )

        order = Order(
            paypal_order_id=paypal_order_id,
            status=OrderStatus.PENDING,
            customer_name=cust.name,
            customer_email=cust.email,
            customer_phone=cust.phone,
            shipping_street=cust.shipping_street,
            shipping_city=cust.shipping_city,
            shipping_state=cust.shipping_state,
            shipping_zip=cust.shipping_zip,
            shipping_country=cust.shipping_country,
            total_amount=total,
        )
        session.add(order)
        session.flush()

        for product in products:
            session.add(OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=qty_map[product.id],
                unit_price=float(product.price),
            ))

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

        order.status = OrderStatus.COMPLETED
        session.commit()

        return OrderCaptureResponse(
            order_id=str(order.id),
            status="completed",
            message="Payment successful, order confirmed",
        )
