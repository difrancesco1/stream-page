import { z } from "zod";

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
] as const;

export const CA_PROVINCE = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", 
  "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
] as const;

export type UsStateCode = (typeof US_STATES)[number];

const usStateSet = new Set<string>(US_STATES);

const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

export const SHIPPING_COUNTRIES = ["US", "CA"] as const;
export type ShippingCountry = (typeof SHIPPING_COUNTRIES)[number];
export const SHIPPING_COUNTRY_LABELS: Record<ShippingCountry, string> = {
  US: "United States",
  CA: "Canada",
};

export const SHIPPING_METHODS = [
  "tracking",
  "no_tracking",
  "pickup",
  "international",
] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const PICKUP_ALLOWED_STATES = new Set<UsStateCode>(["WA"]);

const baseCheckoutObject = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.email("Enter a valid email"),
  discordHandle: z
    .string()
    .trim()
    .min(2, "Discord handle is required")
    .max(50),
  shippingStreet: z.string().trim().min(1, "Street is required").max(300),
  shippingCity: z.string().trim().min(1, "City is required").max(100),
  shippingState: z
    .string()
    .trim()
    .min(1, "State/Province is required")
    .max(100),
  shippingZip: z
    .string()
    .trim()
    .min(1, "Postal code is required")
    .max(20),
  notes: z.string().trim().max(2000, "Notes are too long").optional(),
});

// Enforce the strict US state + ZIP rules. Shared by the public US checkout
// path and the admin in-person flow (which is US-only).
function refineUsAddress(
  values: { shippingState: string; shippingZip: string },
  ctx: z.RefinementCtx,
): void {
  if (!usStateSet.has(values.shippingState)) {
    ctx.addIssue({
      code: "custom",
      path: ["shippingState"],
      message: "Pick a state",
    });
  }
  if (!US_ZIP_REGEX.test(values.shippingZip)) {
    ctx.addIssue({
      code: "custom",
      path: ["shippingZip"],
      message: "Enter a valid ZIP",
    });
  }
}

export const checkoutSchema = baseCheckoutObject
  .extend({
    shippingCountry: z.enum(SHIPPING_COUNTRIES, {
      error: "Pick a country",
    }),
    shippingMethod: z.enum(SHIPPING_METHODS, {
      error: "Pick a shipping option",
    }),
  })
  .superRefine((values, ctx) => {
    if (values.shippingCountry === "US") {
      refineUsAddress(values, ctx);
      if (values.shippingMethod === "international") {
        ctx.addIssue({
          code: "custom",
          path: ["shippingMethod"],
          message: "Pick a US shipping option",
        });
      }
      if (
        values.shippingMethod === "pickup" &&
        !PICKUP_ALLOWED_STATES.has(values.shippingState as UsStateCode)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["shippingMethod"],
          message: "Pickup is only available for WA addresses",
        });
      }
    } else if (values.shippingMethod !== "international") {
      ctx.addIssue({
        code: "custom",
        path: ["shippingMethod"],
        message: "Select international shipping",
      });
    }
  });

// Admin in-person flow keeps the original required-field set without a
// shipping-method picker — they're handing the order over in person. It stays
// US-only, so re-apply the strict US state + ZIP rules relaxed on the base.
export const customOrderSchema = baseCheckoutObject.superRefine(
  refineUsAddress,
);

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
export type CustomOrderFormValues = z.infer<typeof customOrderSchema>;
