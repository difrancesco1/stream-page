import logging
import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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


def _send(to_email: str, subject: str, body_text: str, body_html: str) -> None:
    """Send an email via SMTP with both plain text and HTML parts."""
    if not _is_configured():
        logger.debug("SMTP not configured, skipping email send")
        return

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


def _send_async(to_email: str, subject: str, body_text: str, body_html: str) -> None:
    """Fire-and-forget email send on a background thread."""
    def _worker():
        try:
            _send(to_email, subject, body_text, body_html)
            logger.info("Email sent to %s: %s", to_email, subject)
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
