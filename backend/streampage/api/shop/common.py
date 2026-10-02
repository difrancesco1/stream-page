from fastapi import HTTPException

from streampage.db.enums import ShippingMethod


TRACKING_COST = 6.0
NO_TRACKING_COST = 1.0
PICKUP_DISCOUNT_RATE = 0.20
PICKUP_ALLOWED_STATES = {"WA"}
INTERNATIONAL_SHIPPING_COST = 10.0
FREE_SHIPPING_THRESHOLD = 75.0


_SHIPPING_METHOD_LABELS = {
    ShippingMethod.TRACKING: "Tracking",
    ShippingMethod.NO_TRACKING: "No tracking",
    ShippingMethod.PICKUP: "Pickup",
    ShippingMethod.INTERNATIONAL: "International",
}


def shipping_method_label(method: ShippingMethod | None) -> str | None:
    return _SHIPPING_METHOD_LABELS.get(method) if method else None


def compute_shipping_and_discount(
    method: ShippingMethod,
    shipping_state: str,
    shipping_country: str,
    item_subtotal: float,
) -> tuple[float, float]:
    """Return ``(shipping_cost, discount_amount)`` for the given checkout.

    Raises ``HTTPException(400)`` if the combination is invalid:
    - INTERNATIONAL is available for any non-US destination at a flat rate.
    - Domestic methods (TRACKING/NO_TRACKING/PICKUP) require a US address.
    - PICKUP requires ``shipping_state`` in :data:`PICKUP_ALLOWED_STATES`.

    Orders with an item subtotal at or above :data:`FREE_SHIPPING_THRESHOLD`
    ship free (the shipping cost is zeroed after validation).
    """

    def _apply_free_shipping(cost: float) -> float:
        return 0.0 if item_subtotal >= FREE_SHIPPING_THRESHOLD else cost

    if method == ShippingMethod.INTERNATIONAL:
        if shipping_country == "US":
            raise HTTPException(
                status_code=400,
                detail="International shipping is not available for US addresses",
            )
        return _apply_free_shipping(INTERNATIONAL_SHIPPING_COST), 0.0
    if shipping_country != "US":
        raise HTTPException(
            status_code=400,
            detail="Selected shipping method is only available for US addresses",
        )
    if method == ShippingMethod.TRACKING:
        return _apply_free_shipping(TRACKING_COST), 0.0
    if method == ShippingMethod.NO_TRACKING:
        return _apply_free_shipping(NO_TRACKING_COST), 0.0
    if method == ShippingMethod.PICKUP:
        if shipping_state not in PICKUP_ALLOWED_STATES:
            raise HTTPException(
                status_code=400,
                detail="Pickup is only available for Washington (WA) addresses",
            )
        return 0.0, round(item_subtotal * PICKUP_DISCOUNT_RATE, 2)
    raise HTTPException(status_code=400, detail="Invalid shipping method")
