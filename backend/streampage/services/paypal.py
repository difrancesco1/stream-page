import logging
import time
import uuid
from dataclasses import dataclass

import httpx

from streampage.config import (
    PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET,
    PAYPAL_SANDBOX,
    PAYPAL_TEST_MODE,
)

logger = logging.getLogger(__name__)

SANDBOX_URL = "https://api-m.sandbox.paypal.com"
PRODUCTION_URL = "https://api-m.paypal.com"


@dataclass
class _CachedToken:
    access_token: str
    expires_at: float


class PayPalService:
    def __init__(self, client_id: str, client_secret: str, sandbox: bool = True):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = SANDBOX_URL if sandbox else PRODUCTION_URL
        self._token_cache: _CachedToken | None = None

    async def _get_access_token(self) -> str:
        if self._token_cache and time.time() < self._token_cache.expires_at - 60:
            return self._token_cache.access_token

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/v1/oauth2/token",
                data={"grant_type": "client_credentials"},
                auth=(self.client_id, self.client_secret),
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()

        self._token_cache = _CachedToken(
            access_token=data["access_token"],
            expires_at=time.time() + data.get("expires_in", 3600),
        )
        return self._token_cache.access_token

    async def create_order(
        self,
        total: str,
        currency: str,
        shipping: dict,
    ) -> str:
        """Create a PayPal order and return its ID.

        Args:
            total: Final order total as a string (e.g. "29.99"). Shipping and
                any discounts are already folded in; we deliberately omit the
                per-line items + breakdown so the buyer just sees the final
                amount to pay.
            currency: ISO currency code (e.g. "USD").
            shipping: Dict with name and address fields for PayPal.

        Returns:
            The PayPal order ID.
        """
        if PAYPAL_TEST_MODE:
            fake_id = f"TEST-{uuid.uuid4().hex[:16].upper()}"
            logger.info("PayPal TEST_MODE: synthesized order %s (total=%s %s)", fake_id, total, currency)
            return fake_id

        token = await self._get_access_token()

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "amount": {
                        "currency_code": currency,
                        "value": total,
                    },
                    "shipping": shipping,
                }
            ],
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/v2/checkout/orders",
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        logger.info("PayPal order created: %s", data["id"])
        return data["id"]

    async def capture_order(self, paypal_order_id: str) -> dict:
        """Capture a previously approved PayPal order.

        Returns:
            The full capture response dict from PayPal.
        """
        if PAYPAL_TEST_MODE:
            logger.info("PayPal TEST_MODE: synthesized capture for %s", paypal_order_id)
            return {"status": "COMPLETED", "id": paypal_order_id, "test_mode": True}

        token = await self._get_access_token()

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/v2/checkout/orders/{paypal_order_id}/capture",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        logger.info("PayPal order captured: %s status=%s", paypal_order_id, data.get("status"))
        return data


paypal_service = PayPalService(
    client_id=PAYPAL_CLIENT_ID,
    client_secret=PAYPAL_CLIENT_SECRET,
    sandbox=PAYPAL_SANDBOX,
)
