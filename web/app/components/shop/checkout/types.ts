import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

import type { CheckoutFormValues } from "../checkout-schema";

export type CheckoutMode = "customer" | "admin";

export type Step = "form" | "pay" | "success";

export const defaultFormValues: CheckoutFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  discordHandle: "",
  shippingStreet: "",
  shippingCity: "",
  shippingState: "",
  shippingZip: "",
  shippingCountry: "US",
  shippingMethod: undefined as unknown as CheckoutFormValues["shippingMethod"],
  notes: "",
};

export const INPUT_CLASS =
  "p-[var(--spacing-sm)] pixel-borders bg-background main-text text-xs";
export const FIELD_ERROR_CLASS = "main-text text-[10px] text-red-400";

export interface FieldGroupProps {
  register: UseFormRegister<CheckoutFormValues>;
  control: Control<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
}
