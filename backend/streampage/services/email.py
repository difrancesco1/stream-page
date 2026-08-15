import logging
import smtplib
import threading
from dataclasses import dataclass, field
from datetime import datetime
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
    customer_discord_handle: str
    total_amount: float
    shipping_address_lines: list[str]
    items: list[OrderEmailLineItem] = field(default_factory=list)
    order_url: str | None = None
    shipping_method_label: str | None = None
    item_subtotal: float | None = None
    shipping_cost: float = 0.0
    discount_amount: float = 0.0
    order_date: datetime | None = None


def _format_money(value: float) -> str:
    return f"${value:.2f}"


def _format_date(value: datetime | None) -> str:
    """Human-friendly order date (e.g. "Aug 9, 2026"). Empty when missing."""
    if value is None:
        return ""
    return value.strftime("%b %-d, %Y")


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


def _totals_text(order: "OrderEmailContext") -> str:
    """Multi-line totals block, only emitted when there's a breakdown to show."""
    if (
        order.item_subtotal is None
        and not order.shipping_cost
        and not order.discount_amount
    ):
        return ""
    parts: list[str] = []
    if order.item_subtotal is not None:
        parts.append(f"Subtotal: {_format_money(order.item_subtotal)}")
    method = order.shipping_method_label
    if method or order.shipping_cost:
        label = f"Shipping ({method})" if method else "Shipping"
        parts.append(f"{label}: {_format_money(order.shipping_cost)}")
    if order.discount_amount:
        parts.append(f"Discount: -{_format_money(order.discount_amount)}")
    return "\n".join(parts) + "\n"


def _totals_html(order: "OrderEmailContext") -> str:
    if (
        order.item_subtotal is None
        and not order.shipping_cost
        and not order.discount_amount
    ):
        return ""
    rows: list[str] = []
    if order.item_subtotal is not None:
        rows.append(
            "<tr>"
            "<td style=\"padding:2px 12px 2px 0;\">Subtotal</td>"
            f"<td style=\"padding:2px 0;text-align:right;\">{_format_money(order.item_subtotal)}</td>"
            "</tr>"
        )
    method = order.shipping_method_label
    if method or order.shipping_cost:
        label = f"Shipping ({escape(method)})" if method else "Shipping"
        rows.append(
            "<tr>"
            f"<td style=\"padding:2px 12px 2px 0;\">{label}</td>"
            f"<td style=\"padding:2px 0;text-align:right;\">{_format_money(order.shipping_cost)}</td>"
            "</tr>"
        )
    if order.discount_amount:
        rows.append(
            "<tr>"
            "<td style=\"padding:2px 12px 2px 0;\">Discount</td>"
            f"<td style=\"padding:2px 0;text-align:right;\">-{_format_money(order.discount_amount)}</td>"
            "</tr>"
        )
    return (
        "<table style=\"border-collapse:collapse;margin-top:8px;\">"
        f"<tbody>{''.join(rows)}</tbody>"
        "</table>"
    )


# ---------------------------------------------------------------------------
# Styled receipt renderers (customer-facing order confirmation)
# ---------------------------------------------------------------------------

# Palette pulled from the order-confirmation mockup.
_RECEIPT_PINK = "#f7c6d5"
_RECEIPT_LAVENDER = "#f3ecfb"
_RECEIPT_TEXT = "#2b2b2b"
_RECEIPT_MUTED = "#8a8a8a"
_RECEIPT_BORDER = "#d9d9d9"
_RECEIPT_HEADER_BG = "#efefef"


def _receipt_items_html(items: list[OrderEmailLineItem]) -> str:
    """Bordered Product / Quantity / Price table for the customer receipt.

    Kept separate from `_items_html` so the plainer admin email is unaffected.
    """
    cell = (
        f"padding:14px 16px;border:1px solid {_RECEIPT_BORDER};"
        f"font-size:16px;color:{_RECEIPT_TEXT};"
    )
    header_cell = (
        f"padding:14px 16px;border:1px solid {_RECEIPT_BORDER};"
        f"background:{_RECEIPT_HEADER_BG};font-size:16px;font-weight:bold;"
        f"color:{_RECEIPT_TEXT};"
    )
    rows = "".join(
        "<tr>"
        f"<td style=\"{cell}text-align:left;\">{escape(item.name)}</td>"
        f"<td style=\"{cell}text-align:center;\">{item.quantity}</td>"
        f"<td style=\"{cell}text-align:center;\">{_format_money(item.line_total)}</td>"
        "</tr>"
        for item in items
    )
    return (
        "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" "
        "style=\"border-collapse:collapse;margin-top:12px;\">"
        "<thead><tr>"
        f"<th style=\"{header_cell}text-align:left;\">Product</th>"
        f"<th style=\"{header_cell}text-align:center;\">Quantity</th>"
        f"<th style=\"{header_cell}text-align:center;\">Price</th>"
        "</tr></thead>"
        f"<tbody>{rows}</tbody>"
        "</table>"
    )


def _receipt_totals_html(order: "OrderEmailContext") -> str:
    """Subtotal / Total block styled for the customer receipt."""
    subtotal = (
        order.item_subtotal
        if order.item_subtotal is not None
        else order.total_amount
    )
    label_cell = f"padding:4px 0;font-size:15px;color:{_RECEIPT_TEXT};text-align:left;"
    value_cell = f"padding:4px 0;font-size:15px;color:{_RECEIPT_TEXT};text-align:right;"
    rows = (
        "<tr>"
        f"<td style=\"{label_cell}\">Subtotal Price</td>"
        f"<td style=\"{value_cell}\">{_format_money(subtotal)}</td>"
        "</tr>"
    )
    if order.discount_amount:
        rows += (
            "<tr>"
            f"<td style=\"{label_cell}\">Discount</td>"
            f"<td style=\"{value_cell}\">-{_format_money(order.discount_amount)}</td>"
            "</tr>"
        )
    rows += (
        "<tr>"
        f"<td style=\"{label_cell}font-weight:bold;\">Total Price</td>"
        f"<td style=\"{value_cell}font-weight:bold;\">{_format_money(order.total_amount)}</td>"
        "</tr>"
    )
    return (
        "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" "
        "style=\"border-collapse:collapse;margin-top:8px;\">"
        f"<tbody>{rows}</tbody>"
        "</table>"
    )


def _receipt_shipping_method_html(order: "OrderEmailContext") -> str:
    method = order.shipping_method_label
    if not method and not order.shipping_cost:
        return ""
    label = escape(method) if method else "Shipping"
    cost = f" {_format_money(order.shipping_cost)}" if order.shipping_cost else ""
    return (
        f"<p style=\"margin:16px 0 0;font-weight:bold;color:{_RECEIPT_TEXT};\">Shipping Method</p>"
        f"<p style=\"margin:2px 0 0;color:{_RECEIPT_TEXT};\">{label}{cost}</p>"
    )


def _render_receipt_html(order: "OrderEmailContext") -> str:
    full_name = f"{order.customer_first_name} {order.customer_last_name}".strip()
    order_date = _format_date(order.order_date)

    heading = (
        f"font-size:22px;font-weight:bold;text-align:center;color:{_RECEIPT_TEXT};"
        "margin:28px 0 0;"
    )
    rule = f"border:none;border-top:2px solid {_RECEIPT_TEXT};margin:20px 0;"

    return (
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\">"
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
        "</head>"
        f"<body style=\"margin:0;padding:24px 0;background:#ffffff;"
        "font-family:Arial,Helvetica,sans-serif;\">"
        "<table role=\"presentation\" width=\"500\" align=\"center\" cellpadding=\"0\" "
        "cellspacing=\"0\" style=\"max-width:500px;width:100%;margin:0 auto;\">"
        "<tr><td>"
        # Banner: solid light pink
        f"<div style=\"background:{_RECEIPT_PINK};height:90px;line-height:90px;"
        "text-align:center;border-radius:6px;font-size:26px;font-style:italic;"
        f"font-weight:bold;color:#ffffff;\">roziggz.com</div>"
        # Title
        f"<h1 style=\"{heading}\">ORDER CONFIRMATION</h1>"
        # Greeting box
        f"<div style=\"background:{_RECEIPT_LAVENDER};border-radius:10px;"
        "padding:20px 24px;margin:16px 0 0;text-align:center;font-size:15px;"
        f"line-height:1.6;font-weight:bold;color:{_RECEIPT_TEXT};\">"
        f"Hi {escape(order.customer_first_name)}, thank you for your order!<br>"
        f"We&rsquo;ve received your order #{escape(order.order_id_short)}.<br>"
        "The order will be in works in a few hours.<br>"
        "If you ordered a custom card, please check the waitlist here: "
        "<a href=\"https://www.roziggz.com/shop?tab=custom\" "
        f"style=\"color:{_RECEIPT_TEXT};\">https://www.roziggz.com/shop?tab=custom</a><br>"
        "one custom card will be completed per workday."
        "</div>"
        # Order Summary
        f"<h2 style=\"{heading}\">Order Summary</h2>"
        f"<p style=\"text-align:center;margin:2px 0 0;font-weight:bold;"
        f"color:{_RECEIPT_TEXT};\">{escape(order_date)}</p>"
        f"{_receipt_items_html(order.items)}"
        # Order Total
        f"<h2 style=\"{heading}\">Order Total</h2>"
        f"{_receipt_totals_html(order)}"
        f"<hr style=\"{rule}\">"
        # Shipping
        f"<h2 style=\"{heading}margin-top:0;\">Shipping</h2>"
        f"<p style=\"margin:12px 0 0;font-weight:bold;color:{_RECEIPT_TEXT};\">Shipping</p>"
        f"<p style=\"margin:2px 0 0;color:{_RECEIPT_MUTED};line-height:1.5;\">"
        f"{escape(full_name)}<br>{_shipping_html(order.shipping_address_lines)}</p>"
        f"{_receipt_shipping_method_html(order)}"
        f"<hr style=\"{rule}\">"
        # Footer
        "<p style=\"text-align:center;margin:0;color:#555555;font-size:14px;\">"
        "dm @ros.e on discord if any issues</p>"
        "<p style=\"text-align:center;margin:4px 0 0;color:#555555;font-size:14px;\">"
        "roziggz.com/shop</p>"
        "</td></tr></table></body></html>"
    )


def send_order_receipt_email(to_email: str, order: OrderEmailContext) -> None:
    """Send the customer-facing itemized order receipt.

    Sends on a background thread so the HTTP response is not blocked.
    """
    subject = f"Your order #{order.order_id_short} is confirmed"
    full_name = f"{order.customer_first_name} {order.customer_last_name}".strip()
    total = _format_money(order.total_amount)

    totals_text = _totals_text(order)

    body_text = (
        f"Hi {order.customer_first_name},\n\n"
        f"Thanks for your order! Your payment was received and your order "
        f"#{order.order_id_short} is confirmed.\n\n"
        f"Items:\n{_items_text(order.items)}\n\n"
        f"{totals_text}"
        f"Order total: {total}\n\n"
        f"Shipping to:\n{full_name}\n{_shipping_text(order.shipping_address_lines)}"
    )

    body_html = _render_receipt_html(order)

    _send_async(to_email, subject, body_text, body_html)


def send_contact_email(
    to_email: str,
    sender_name: str,
    sender_email: str,
    message: str,
) -> None:
    """Forward a shop contact-form submission to the admin.

    Sends on a background thread so the HTTP response is not blocked.
    """
    subject = f"Shop contact from {sender_name}"

    body_text = (
        f"New contact message\n\n"
        f"From: {sender_name} ({sender_email})\n\n"
        f"Message:\n{message}"
    )

    safe_name = escape(sender_name)
    safe_email = escape(sender_email)
    safe_message = escape(message).replace("\n", "<br>")

    body_html = (
        "<html><body>"
        "<h2>New contact message</h2>"
        f"<p><strong>From:</strong> {safe_name} "
        f"(<a href=\"mailto:{safe_email}\">{safe_email}</a>)</p>"
        f"<p><strong>Message:</strong></p>"
        f"<p>{safe_message}</p>"
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

    totals_text = _totals_text(order)
    totals_html = _totals_html(order)

    body_text = (
        f"New order received\n\n"
        f"Order: #{order.order_id_short}\n"
        f"Total: {total}\n\n"
        f"{track_text}"
        f"Customer:\n"
        f"  {full_name}\n"
        f"  {order.customer_email}\n"
        f"  Discord: {order.customer_discord_handle}\n\n"
        f"Items:\n{_items_text(order.items)}\n\n"
        f"{totals_text}"
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
        f"Discord: {escape(order.customer_discord_handle)}"
        "</p>"
        "<h3 style=\"margin-bottom:4px;\">Items</h3>"
        f"{_items_html(order.items)}"
        f"{totals_html}"
        "<h3 style=\"margin-bottom:4px;margin-top:16px;\">Ship to</h3>"
        f"<p style=\"margin-top:0;\">{escape(full_name)}<br>{_shipping_html(order.shipping_address_lines)}</p>"
        "</body></html>"
    )

    _send_async(to_email, subject, body_text, body_html)
