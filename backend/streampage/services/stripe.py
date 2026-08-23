import asyncio
import logging
import uuid

import stripe

from streampage.config import STRIPE_SECRET_KEY, STRIPE_TEST_MODE

logger = logging.getLogger(__name__)


class StripeService:
    """
    Thin wrapper around the Stripe PaymentIntents API.
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        if api_key:
            stripe.api_key = api_key

    async def create_payment_intent(
        self,
        total: str,
        currency: str,
        metadata: dict | None = None,
    ) -> dict:
        """Create a PaymentIntent and return ``{"id", "client_secret"}``.

        Args:
            total: Final order total as a string (e.g. "29.99"). Shipping and
                discounts are already folded in.
            currency: ISO currency code (e.g. "usd").
            metadata: Optional key/value strings attached to the intent for
                reconciliation in the Stripe dashboard.

        Returns:
            Dict with the PaymentIntent ``id`` and ``client_secret``.
        """
        amount_cents = int(round(float(total) * 100))

        if STRIPE_TEST_MODE:
            fake_id = f"pi_TEST_{uuid.uuid4().hex[:16]}"
            logger.info(
                "Stripe TEST_MODE: synthesized intent %s (amount=%s %s)",
                fake_id,
                amount_cents,
                currency,
            )
            return {"id": fake_id, "client_secret": f"{fake_id}_secret_test"}

        intent = await asyncio.to_thread(
            stripe.PaymentIntent.create,
            amount=amount_cents,
            currency=currency,
            automatic_payment_methods={"enabled": True},
            metadata=metadata or {},
        )
        logger.info("Stripe PaymentIntent created: %s", intent["id"])
        return {"id": intent["id"], "client_secret": intent["client_secret"]}

    async def retrieve_payment_intent(self, intent_id: str) -> dict:
        """Retrieve a PaymentIntent so its status/amount can be verified."""
        if STRIPE_TEST_MODE:
            logger.info("Stripe TEST_MODE: synthesized retrieve for %s", intent_id)
            return {"id": intent_id, "status": "succeeded", "test_mode": True}

        intent = await asyncio.to_thread(stripe.PaymentIntent.retrieve, intent_id)
        data = intent.to_dict()
        logger.info(
            "Stripe PaymentIntent retrieved: %s status=%s",
            intent_id,
            data.get("status"),
        )
        return data


stripe_service = StripeService(api_key=STRIPE_SECRET_KEY)
