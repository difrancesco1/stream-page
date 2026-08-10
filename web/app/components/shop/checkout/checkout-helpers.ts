import type {
  CartCustomizationPayload,
  CartLineItem,
  CheckoutCustomerInfo,
} from "@/app/api/shop/checkout-actions";

import type { CartCustomization } from "../cart-context";
import type { CheckoutFormValues } from "../checkout-schema";
import type { ShopItem } from "../types";
import type { CheckoutMode } from "./types";

export function buildCartLineItems(
  cart: Record<string, number>,
  items: ShopItem[],
): CartLineItem[] {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  return Object.entries(cart)
    .filter(([id]) => itemMap.has(id))
    .map(([product_id, quantity]) => ({ product_id, quantity }));
}

export function buildCustomizationPayload(
  customizations: CartCustomization[],
  items: ShopItem[],
): CartCustomizationPayload[] {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  return customizations
    .filter((c) => itemMap.has(c.productId))
    .map((c) => ({
      product_id: c.productId,
      card_name: c.cardName,
      description: c.description,
    }));
}

export function toCustomerPayload(
  values: CheckoutFormValues,
  mode: CheckoutMode,
): CheckoutCustomerInfo {
  return {
    first_name: values.firstName,
    last_name: values.lastName,
    email: values.email,
    discord_handle: values.discordHandle,
    shipping_street: values.shippingStreet,
    shipping_city: values.shippingCity,
    shipping_state: values.shippingState,
    shipping_zip: values.shippingZip,
    shipping_country: values.shippingCountry,
    ...(mode === "customer" ? { shipping_method: values.shippingMethod } : {}),
    notes: values.notes?.trim() ? values.notes.trim() : null,
  };
}
