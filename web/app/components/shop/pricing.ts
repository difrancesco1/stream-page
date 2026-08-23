import {
  PICKUP_ALLOWED_STATES,
  type ShippingMethod,
  type UsStateCode,
} from "./checkout-schema";

export const TRACKING_COST = 6;
export const NO_TRACKING_COST = 1;
export const PICKUP_DISCOUNT_RATE = 0.2;
export const INTERNATIONAL_SHIPPING_COST = 10;
export const FREE_SHIPPING_THRESHOLD = 75;

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  tracking: "Tracking",
  no_tracking: "No tracking",
  pickup: "Pickup",
  international: "International",
};

export function shippingCostFor(method: ShippingMethod | null): number {
  if (method === "tracking") return TRACKING_COST;
  if (method === "no_tracking") return NO_TRACKING_COST;
  if (method === "international") return INTERNATIONAL_SHIPPING_COST;
  return 0;
}

export function discountFor(
  subtotal: number,
  method: ShippingMethod | null,
  state: string | null,
): number {
  if (
    method !== "pickup" ||
    !state ||
    !PICKUP_ALLOWED_STATES.has(state as UsStateCode)
  ) {
    return 0;
  }
  return Math.round(subtotal * PICKUP_DISCOUNT_RATE * 100) / 100;
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
): OrderTotals {
  const shipping =
    subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : shippingCostFor(method);
  const discount = discountFor(subtotal, method, state);
  const total = Math.max(0, subtotal + shipping - discount);
  return { subtotal, shipping, discount, total };
}

export const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
