import logging

from fastapi import APIRouter
from sqlalchemy import select, func

from streampage.config import SHOP_ADMIN_EMAIL
from streampage.api.shop.models import (
    ContactRequest,
    ResponseMessage,
)
from streampage.db.engine import get_db_session
from streampage.db.models import User
from streampage.services.email import send_contact_email


logger = logging.getLogger(__name__)

contact_router = APIRouter()


# ---------------------------------------------------------------------------
# Contact
# ---------------------------------------------------------------------------

@contact_router.post("/contact", response_model=ResponseMessage)
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
