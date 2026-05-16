import { z } from "zod";

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
] as const;

export type UsStateCode = (typeof US_STATES)[number];

const usStateSet = new Set<string>(US_STATES);

export const SHIPPING_METHODS = ["tracking", "no_tracking", "pickup"] as const;
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
    .min(1, "Pick a state")
    .refine((v) => usStateSet.has(v), { message: "Pick a state" }),
  shippingZip: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP"),
  notes: z.string().trim().max(2000, "Notes are too long").optional(),
});

export const checkoutSchema = baseCheckoutObject
  .extend({
    shippingMethod: z.enum(SHIPPING_METHODS, {
      error: "Pick a shipping option",
    }),
  })
  .superRefine((values, ctx) => {
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
  });

// Admin in-person flow keeps the original required-field set without a
// shipping-method picker — they're handing the order over in person.
export const customOrderSchema = baseCheckoutObject;

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
export type CustomOrderFormValues = z.infer<typeof customOrderSchema>;
