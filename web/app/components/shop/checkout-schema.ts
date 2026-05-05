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

export const checkoutSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.email("Enter a valid email"),
  phone: z.string().trim().min(7, "Phone is required").max(30),
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
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
