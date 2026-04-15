from datetime import datetime

from pydantic import BaseModel, EmailStr

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

class ProductResponse(BaseModel):
    id: str
    category: str
    name: str
    slug: str
    description: str | None
    price: float
    quantity: int
    image_url: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CartItem(BaseModel):
    product_id: str
    quantity: int

class CustomerInfo(BaseModel):
    name: str
    email: str
    phone: str | None = None
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
