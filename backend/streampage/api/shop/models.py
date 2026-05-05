from datetime import datetime

from pydantic import BaseModel

from streampage.db.enums import ProductCategory


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

class CustomerInfo(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    shipping_street: str
    shipping_city: str
    shipping_state: str
    shipping_zip: str
    shipping_country: str

class OrderCreateRequest(BaseModel):
    items: list[CartItem]
    customer: CustomerInfo

class OrderCreateResponse(BaseModel):
    order_id: str
    paypal_order_id: str

class OrderCaptureResponse(BaseModel):
    order_id: str
    status: str
    message: str

class ResponseMessage(BaseModel):
    message: str
