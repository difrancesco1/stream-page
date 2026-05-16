import type { ShopItem } from "./types";
import type { ShippingMethod } from "./checkout-schema";

// Mirrors backend constants in `streampage/api/shop/shop.py`. The backend is
// the source of truth at checkout — these values only power the live order
// summary in the checkout modal and the rendered breakdown on the order
// detail page.
export const TRACKING_COST = 6;
export const NO_TRACKING_COST = 1;
export const CUSTOM_PICKUP_DISCOUNT_PER_UNIT = 10;

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  tracking: "Tracking",
  no_tracking: "No tracking",
  pickup: "Pickup",
};

export function shippingCostFor(method: ShippingMethod | null): number {
  if (method === "tracking") return TRACKING_COST;
  if (method === "no_tracking") return NO_TRACKING_COST;
  return 0;
}

function customUnitsInCart(
  cart: Record<string, number>,
  items: ShopItem[],
): number {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  let units = 0;
  for (const [id, qty] of Object.entries(cart)) {
    const item = itemMap.get(id);
    if (item && item.category === "custom") units += qty;
  }
  return units;
}

export function discountFor(
  method: ShippingMethod | null,
  state: string | null,
  cart: Record<string, number>,
  items: ShopItem[],
): number {
  if (method !== "pickup" || state !== "WA") return 0;
  return CUSTOM_PICKUP_DISCOUNT_PER_UNIT * customUnitsInCart(cart, items);
}

export type OrderTotals = {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
};

export function computeOrderTotals(
  subtotal: number,
  method: ShippingMethod | null,
  state: string | null,
  cart: Record<string, number>,
  items: ShopItem[],
): OrderTotals {
  const shipping = shippingCostFor(method);
  const discount = discountFor(method, state, cart, items);
  const total = Math.max(0, subtotal + shipping - discount);
  return { subtotal, shipping, discount, total };
}

export const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
