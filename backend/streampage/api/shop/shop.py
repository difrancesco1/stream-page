from fastapi import APIRouter

from streampage.api.shop.products import products_router
from streampage.api.shop.orders import orders_router
from streampage.api.shop.customizations import customizations_router
from streampage.api.shop.contact import contact_router

shop_router = APIRouter()
shop_router.include_router(products_router)
shop_router.include_router(orders_router)
shop_router.include_router(customizations_router)
shop_router.include_router(contact_router)
