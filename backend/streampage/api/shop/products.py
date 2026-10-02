import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import select, func, case, cast, String
from sqlalchemy.orm import Session, selectinload

from streampage.api.middleware.authenticator import require_creator
from streampage.api.shop.models import (
    ProductResponse,
    ProductMediaResponse,
    ProductMediaUpdate,
    ProductMediaReorderRequest,
    ProductReorderRequest,
    ResponseMessage,
)
from streampage.db.engine import get_db_session
from streampage.db.enums import ProductCategory, ProductMediaType
from streampage.db.models import (
    Product,
    ProductMedia,
    OrderItem,
    User,
)
from streampage.services.storage import (
    storage_service,
    ALLOWED_IMAGE_EXTENSIONS,
    ALLOWED_VIDEO_EXTENSIONS,
    MAX_VIDEO_BYTES,
)


products_router = APIRouter()


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
        display_order=p.display_order,
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


@products_router.post("/products", response_model=ProductResponse)
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

        # New products land at the bottom of the existing display order so
        # admin reordering stays predictable.
        current_max = session.execute(
            select(func.max(Product.display_order))
        ).scalar()
        next_order = (current_max + 1) if current_max is not None else 0

        product = Product(
            name=name,
            category=category,
            slug=slug,
            description=description,
            price=price,
            quantity=quantity,
            display_order=next_order,
        )
        session.add(product)
        session.commit()
        session.refresh(product)
        # Trigger media load (will be empty for a freshly created product).
        _ = list(product.media)
        return _product_to_response(product)


@products_router.get("/products", response_model=list[ProductResponse])
def list_products(
    category: ProductCategory | None = Query(None),
    active_only: bool = Query(True),
):
    with get_db_session() as session:
        category_order = case(
            {"custom": 0, "tokens": 1, "stickers": 2},
            value=cast(Product.category, String),
            else_=3,
        )
        stmt = (
            select(Product)
            .options(selectinload(Product.media))
            .order_by(
                category_order.asc(),
                Product.display_order.asc(),
                Product.created_at.desc(),
            )
        )
        if category:
            stmt = stmt.where(Product.category == category)
        if active_only:
            stmt = stmt.where(Product.is_active == True)

        products = session.execute(stmt).scalars().all()
        return [_product_to_response(p) for p in products]


@products_router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: str):
    with get_db_session() as session:
        product = _load_product(session, product_id)
        return _product_to_response(product)


@products_router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    name: str | None = Form(None),
    category: ProductCategory | None = Form(None),
    price: float | None = Form(None),
    quantity: int | None = Form(None),
    description: str | None = Form(None),
    is_active: bool | None = Form(None),
    display_order: int | None = Form(None),
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
        if display_order is not None:
            product.display_order = display_order

        session.commit()
        session.refresh(product)
        _ = list(product.media)
        return _product_to_response(product)


@products_router.delete("/products/{product_id}", response_model=ResponseMessage)
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


@products_router.post(
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


@products_router.patch(
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


@products_router.delete(
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


@products_router.put(
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


@products_router.put(
    "/products/order",
    response_model=list[ProductResponse],
)
def reorder_products(
    body: ProductReorderRequest,
    user: User = Depends(require_creator),
):
    """Bulk-update ``display_order`` for a set of products.

    Mirrors the media-reorder pattern: clients send the full desired ordering
    (or just the subset they're shuffling) and we update each row in a single
    transaction. Returns the resulting product list sorted by the new order
    so the admin UI can re-render without a follow-up GET.
    """
    if not body.order:
        return []

    with get_db_session() as session:
        product_ids = [uuid.UUID(entry.id) for entry in body.order]
        products = session.execute(
            select(Product)
            .where(Product.id.in_(product_ids))
            .options(selectinload(Product.media))
        ).scalars().all()
        product_by_id = {p.id: p for p in products}

        for entry in body.order:
            pid = uuid.UUID(entry.id)
            product = product_by_id.get(pid)
            if not product:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product {entry.id} not found",
                )
            product.display_order = entry.display_order

        session.commit()

        refreshed = session.execute(
            select(Product)
            .options(selectinload(Product.media))
            .order_by(
                Product.display_order.asc(),
                Product.created_at.desc(),
            )
        ).scalars().all()
        return [_product_to_response(p) for p in refreshed]
