from datetime import datetime

from pydantic import BaseModel

from streampage.db.enums import OrderStatus, ProductCategory, ShippingMethod


class ProductCreate(BaseModel):
    name: str
    category: ProductCategory
    description: str | None = None
    price: float
    quantity: int = 0

class ProductUpdate(BaseModel):
    name: str | None = None
    category: ProductCategory | None = None
    description: str | None = None
    price: float | None = None
    quantity: int | None = None
    is_active: bool | None = None


class ProductMediaResponse(BaseModel):
    id: str
    url: str
    media_type: str
    display_order: int
    is_featured: bool
    created_at: datetime


class ProductMediaUpdate(BaseModel):
    is_featured: bool | None = None
    display_order: int | None = None


class MediaOrderEntry(BaseModel):
    id: str
    display_order: int


class ProductMediaReorderRequest(BaseModel):
    order: list[MediaOrderEntry]


class ProductResponse(BaseModel):
    id: str
    category: str
    name: str
    slug: str
    description: str | None
    price: float
    quantity: int
    media: list[ProductMediaResponse]
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CartItem(BaseModel):
    product_id: str
    quantity: int


class CartCustomization(BaseModel):
    """One custom-card-art instance from the cart. Each row in the cart
    customization list becomes a separate ``order_customization`` DB row."""
    product_id: str
    card_name: str
    description: str


class CustomerInfo(BaseModel):
    first_name: str
    last_name: str
    email: str
    discord_handle: str
    shipping_street: str
    shipping_city: str
    shipping_state: str
    shipping_zip: str
    shipping_country: str
    shipping_method: ShippingMethod | None = None
    notes: str | None = None

class OrderCreateRequest(BaseModel):
    items: list[CartItem]
    customer: CustomerInfo
    customizations: list[CartCustomization] = []

class OrderCreateResponse(BaseModel):
    order_id: str
    paypal_order_id: str

class OrderCaptureResponse(BaseModel):
    order_id: str
    status: str
    message: str


class OrderCustomizationResponse(BaseModel):
    id: str
    product_id: str
    card_name: str
    description: str
    is_complete: bool = False
    image_url: str | None = None
    completed_at: datetime | None = None


class CustomizationQueueRow(BaseModel):
    """One row in the admin "queue" view. Each row is either:

    - ``kind="custom"``: one ``order_customization`` (a single custom card art
      to draw). ``quantity`` is always 1.
    - ``kind="item"``: one non-custom ``order_item`` (e.g. stickers x3).
      ``quantity`` is the line quantity. ``card_name`` is the product name and
      ``description`` is blank.

    Joined with denormalized order metadata so the queue can render without
    an extra fetch per row.
    """
    id: str
    kind: str
    quantity: int
    order_id: str
    order_id_short: str
    order_status: str
    order_created_at: datetime
    card_name: str
    description: str
    is_complete: bool
    image_url: str | None
    completed_at: datetime | None = None
    customer_first_name: str
    customer_last_name: str
    customer_email: str
    customer_discord_handle: str
    shipping_street: str
    shipping_city: str
    shipping_state: str
    shipping_zip: str
    shipping_country: str
    product_name: str
    order_total_quantity: int


class CustomizationUpdateRequest(BaseModel):
    is_complete: bool | None = None


class OrderItemResponse(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    line_total: float
    customizations: list[OrderCustomizationResponse] = []


class OrderSummary(BaseModel):
    """Compact representation of an order for list views."""
    id: str
    status: str
    customer_first_name: str
    customer_last_name: str
    customer_email: str
    customer_discord_handle: str
    total_amount: float
    item_count: int
    tracking_number: str | None
    created_at: datetime


class OrderDetail(BaseModel):
    """Full order payload returned by detail endpoints."""
    id: str
    status: str
    customer_first_name: str
    customer_last_name: str
    customer_email: str
    customer_discord_handle: str
    shipping_street: str
    shipping_city: str
    shipping_state: str
    shipping_zip: str
    shipping_country: str
    shipping_method: str | None
    shipping_cost: float
    discount_amount: float
    total_amount: float
    items: list[OrderItemResponse]
    tracking_number: str | None
    tracking_carrier: str | None
    tracking_url: str | None
    notes: str | None
    shipped_at: datetime | None
    created_at: datetime
    updated_at: datetime


class OrderUpdateRequest(BaseModel):
    status: OrderStatus | None = None
    tracking_number: str | None = None
    tracking_carrier: str | None = None
    tracking_url: str | None = None
    notes: str | None = None
    shipped_at: datetime | None = None


class ContactRequest(BaseModel):
    name: str
    email: str
    message: str


class WaitlistEntry(BaseModel):
    """Public, PII-light view of a single custom-card-art row.

    Powers the public waitlist UI on ``/shop``. Server returns rows in FIFO
    order (oldest order first) so the WAITLIST popover can render directly
    and the gallery only has to reverse for newest-first.
    """
    id: str
    card_name: str
    image_url: str | None
    is_complete: bool
    customer_discord_handle: str
    order_created_at: datetime
    created_at: datetime
    completed_at: datetime | None = None


class ResponseMessage(BaseModel):
    message: str
