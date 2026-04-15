import logging
import time
from dataclasses import dataclass

import httpx

from streampage.config import PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_SANDBOX

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
        items: list[dict],
        shipping: dict,
    ) -> str:
        """Create a PayPal order and return its ID.

        Args:
            total: Order total as a string (e.g. "29.99").
            currency: ISO currency code (e.g. "USD").
            items: List of dicts with name, unit_amount, quantity.
            shipping: Dict with name and address fields for PayPal.

        Returns:
            The PayPal order ID.
        """
        token = await self._get_access_token()

        item_total = sum(
            float(i["unit_amount"]["value"]) * int(i["quantity"]) for i in items
        )

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "amount": {
                        "currency_code": currency,
                        "value": total,
                        "breakdown": {
                            "item_total": {
                                "currency_code": currency,
                                "value": f"{item_total:.2f}",
                            }
                        },
                    },
                    "items": items,
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
