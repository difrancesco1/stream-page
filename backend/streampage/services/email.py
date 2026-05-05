import logging
import smtplib
import threading
from dataclasses import dataclass, field
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from html import escape

from streampage.config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_FROM_EMAIL,
)

logger = logging.getLogger(__name__)


def _is_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD and SMTP_FROM_EMAIL)


def _send(to_email: str, subject: str, body_text: str, body_html: str) -> bool:
    """Send an email via SMTP. Returns True if delivered to the SMTP server,
    False if skipped because SMTP isn't configured."""
    if not _is_configured():
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject

    # Plain text first (fallback), then HTML (preferred by clients)
    msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(body_html, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())
    return True


def _send_async(to_email: str, subject: str, body_text: str, body_html: str) -> None:
    """Fire-and-forget email send on a background thread."""
    def _worker():
        try:
            sent = _send(to_email, subject, body_text, body_html)
            if sent:
                logger.info("Email sent to %s: %s", to_email, subject)
            else:
                logger.warning(
                    "SMTP not configured; skipped email to %s: %s",
                    to_email,
                    subject,
                )
        except Exception:
            logger.warning("Failed to send email to %s: %s", to_email, subject, exc_info=True)

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()


def send_form_response_email(
    to_email: str,
    form_title: str,
    respondent_username: str,
) -> None:
    """Notify the form creator that someone submitted a response.

    Sends on a background thread so the HTTP response is not blocked.
    """
    subject = f"New response to '{form_title}'"

    body_text = (
        f"New Form Response\n\n"
        f"{respondent_username} submitted a response to your form "
        f"\"{form_title}\".\n\n"
        f"Log in to view the full response."
    )

    body_html = (
        "<html><body>"
        "<h2>New Form Response</h2>"
        f"<p><strong>{respondent_username}</strong> submitted a response to your form "
        f"<strong>\"{form_title}\"</strong>.</p>"
        "<p>Log in to view the full response.</p>"
        "</body></html>"
    )

    _send_async(to_email, subject, body_text, body_html)


# ---------------------------------------------------------------------------
# Shop order emails
# ---------------------------------------------------------------------------

@dataclass
class OrderEmailLineItem:
    name: str
    quantity: int
    unit_price: float
    line_total: float


@dataclass
class OrderEmailContext:
    """Presentation-ready snapshot of an order for email rendering.

    Built at the route layer while the SQLAlchemy session is still open so the
    email functions can be pure (no DB access, no ORM lazy-loads).
    """
    order_id_short: str
    customer_first_name: str
    customer_last_name: str
    customer_email: str
    customer_phone: str
    total_amount: float
    shipping_address_lines: list[str]
    items: list[OrderEmailLineItem] = field(default_factory=list)
    order_url: str | None = None


def _format_money(value: float) -> str:
    return f"${value:.2f}"


def _items_text(items: list[OrderEmailLineItem]) -> str:
    return "\n".join(
        f"  - {item.name} x{item.quantity} @ {_format_money(item.unit_price)}"
        f" = {_format_money(item.line_total)}"
        for item in items
    )


def _items_html(items: list[OrderEmailLineItem]) -> str:
    rows = "".join(
        "<tr>"
        f"<td style=\"padding:4px 12px 4px 0;\">{escape(item.name)}</td>"
        f"<td style=\"padding:4px 12px 4px 0;text-align:right;\">{item.quantity}</td>"
        f"<td style=\"padding:4px 12px 4px 0;text-align:right;\">{_format_money(item.unit_price)}</td>"
        f"<td style=\"padding:4px 0;text-align:right;\">{_format_money(item.line_total)}</td>"
        "</tr>"
        for item in items
    )
    return (
        "<table style=\"border-collapse:collapse;margin-top:8px;\">"
        "<thead><tr>"
        "<th style=\"text-align:left;padding:4px 12px 4px 0;\">Item</th>"
        "<th style=\"text-align:right;padding:4px 12px 4px 0;\">Qty</th>"
        "<th style=\"text-align:right;padding:4px 12px 4px 0;\">Unit</th>"
        "<th style=\"text-align:right;padding:4px 0;\">Total</th>"
        "</tr></thead>"
        f"<tbody>{rows}</tbody>"
        "</table>"
    )


def _shipping_text(lines: list[str]) -> str:
    return "\n".join(line for line in lines if line)


def _shipping_html(lines: list[str]) -> str:
    return "<br>".join(escape(line) for line in lines if line)


def send_order_receipt_email(to_email: str, order: OrderEmailContext) -> None:
    """Send the customer-facing itemized order receipt.

    Sends on a background thread so the HTTP response is not blocked.
    """
    subject = f"Your order #{order.order_id_short} is confirmed"
    full_name = f"{order.customer_first_name} {order.customer_last_name}".strip()
    total = _format_money(order.total_amount)

    track_text = (
        f"Track your order: {order.order_url}\n\n" if order.order_url else ""
    )
    track_html = (
        f"<p><a href=\"{escape(order.order_url)}\">Track your order</a></p>"
        if order.order_url
        else ""
    )

    body_text = (
        f"Hi {order.customer_first_name},\n\n"
        f"Thanks for your order! Your payment was received and your order "
        f"#{order.order_id_short} is confirmed.\n\n"
        f"{track_text}"
        f"Items:\n{_items_text(order.items)}\n\n"
        f"Order total: {total}\n\n"
        f"Shipping to:\n{full_name}\n{_shipping_text(order.shipping_address_lines)}\n\n"
        f"We'll be in touch when your order ships."
    )

    body_html = (
        "<html><body>"
        f"<h2>Order #{escape(order.order_id_short)} confirmed</h2>"
        f"<p>Hi {escape(order.customer_first_name)},</p>"
        "<p>Thanks for your order! Your payment was received and your order is confirmed.</p>"
        f"{track_html}"
        f"{_items_html(order.items)}"
        f"<p style=\"margin-top:16px;\"><strong>Order total: {total}</strong></p>"
        "<h3 style=\"margin-bottom:4px;\">Shipping to</h3>"
        f"<p style=\"margin-top:0;\">{escape(full_name)}<br>{_shipping_html(order.shipping_address_lines)}</p>"
        "<p>We'll be in touch when your order ships.</p>"
        "</body></html>"
    )

    _send_async(to_email, subject, body_text, body_html)


def send_order_admin_notification_email(to_email: str, order: OrderEmailContext) -> None:
    """Notify the creator/admin of a newly captured order.

    Mirrors the customer receipt body so the admin sees the full order at a
    glance, plus the customer's contact details for fulfillment.
    """
    total = _format_money(order.total_amount)
    subject = f"New order #{order.order_id_short} - {total}"
    full_name = f"{order.customer_first_name} {order.customer_last_name}".strip()

    track_text = (
        f"View order: {order.order_url}\n\n" if order.order_url else ""
    )
    track_html = (
        f"<p><a href=\"{escape(order.order_url)}\">View order</a></p>"
        if order.order_url
        else ""
    )

    body_text = (
        f"New order received\n\n"
        f"Order: #{order.order_id_short}\n"
        f"Total: {total}\n\n"
        f"{track_text}"
        f"Customer:\n"
        f"  {full_name}\n"
        f"  {order.customer_email}\n"
        f"  {order.customer_phone}\n\n"
        f"Items:\n{_items_text(order.items)}\n\n"
        f"Ship to:\n{full_name}\n{_shipping_text(order.shipping_address_lines)}"
    )

    body_html = (
        "<html><body>"
        f"<h2>New order #{escape(order.order_id_short)}</h2>"
        f"<p><strong>Total: {total}</strong></p>"
        f"{track_html}"
        "<h3 style=\"margin-bottom:4px;\">Customer</h3>"
        "<p style=\"margin-top:0;\">"
        f"{escape(full_name)}<br>"
        f"{escape(order.customer_email)}<br>"
        f"{escape(order.customer_phone)}"
        "</p>"
        "<h3 style=\"margin-bottom:4px;\">Items</h3>"
        f"{_items_html(order.items)}"
        "<h3 style=\"margin-bottom:4px;margin-top:16px;\">Ship to</h3>"
        f"<p style=\"margin-top:0;\">{escape(full_name)}<br>{_shipping_html(order.shipping_address_lines)}</p>"
        "</body></html>"
    )

    _send_async(to_email, subject, body_text, body_html)
