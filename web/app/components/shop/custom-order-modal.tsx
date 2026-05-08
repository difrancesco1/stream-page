"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Dialog, DialogContent } from "@/components/ui/dialog";

import {
  createCustomOrder,
  type CartLineItem,
  type CheckoutCustomerInfo,
} from "@/app/api/shop/checkout-actions";
import { useAuth } from "@/app/context/auth-context";

import { useCart } from "./cart-context";
import {
  US_STATES,
  checkoutSchema,
  type CheckoutFormValues,
} from "./checkout-schema";
import type { ShopItem } from "./types";
import CardHeader from "../shared/card-header";

interface CustomOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ShopItem[];
}

type Step = "form" | "success";

const defaultFormValues: CheckoutFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  discordHandle: "",
  shippingStreet: "",
  shippingCity: "",
  shippingState: "",
  shippingZip: "",
};

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function buildCartLineItems(
  cart: Record<string, number>,
  items: ShopItem[],
): CartLineItem[] {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  return Object.entries(cart)
    .filter(([id]) => itemMap.has(id))
    .map(([product_id, quantity]) => ({ product_id, quantity }));
}

function toCustomerPayload(values: CheckoutFormValues): CheckoutCustomerInfo {
  return {
    first_name: values.firstName,
    last_name: values.lastName,
    email: values.email,
    discord_handle: values.discordHandle,
    shipping_street: values.shippingStreet,
    shipping_city: values.shippingCity,
    shipping_state: values.shippingState,
    shipping_zip: values.shippingZip,
    shipping_country: "US",
  };
}

export default function CustomOrderModal({
  open,
  onOpenChange,
  items,
}: CustomOrderModalProps) {
  const { cart, clear } = useCart();
  const { token } = useAuth();

  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema as never) as Resolver<CheckoutFormValues>,
    defaultValues: defaultFormValues,
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  useEffect(() => {
    if (open) {
      setStep("form");
      setError(null);
      setSubmitting(false);
      setSuccessOrderId(null);
      setSuccessEmail(null);
      reset(defaultFormValues);
    }
  }, [open, reset]);

  const cartLineItems = buildCartLineItems(cart, items);
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const cartTotal = cartLineItems.reduce((sum, line) => {
    const item = itemMap.get(line.product_id);
    return item ? sum + item.price * line.quantity : sum;
  }, 0);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    if (cartLineItems.length === 0) {
      setError("Your cart is empty");
      return;
    }
    if (!token) {
      setError("You must be signed in as the shop admin");
      return;
    }
    setSubmitting(true);
    try {
      const customer = toCustomerPayload(values);
      const result = await createCustomOrder(token, cartLineItems, customer);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccessOrderId(result.order.id);
      setSuccessEmail(result.order.customer_email);
      clear();
      setStep("success");
    } finally {
      setSubmitting(false);
    }
  });

  const inputClass =
    "p-[var(--spacing-sm)] pixel-borders bg-background main-text text-xs";
  const fieldErrorClass = "main-text text-[10px] text-red-400";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="pixel-borders pixel-card bg-foreground border-[length:var(--border-width)] border-border max-h-[90vh] overflow-y-auto p-[var(--spacing-md)] max-w-[26rem]"
      >
        <CardHeader title="custom order" exitbtn={true} showTabs={false}>
          {step === "form" && (
            <form
              onSubmit={onSubmit}
              noValidate
              className="flex flex-col gap-[var(--spacing-sm)]"
            >

              <div className="grid grid-cols-2 gap-[var(--spacing-sm)]">
                <div className="flex flex-col gap-[var(--spacing-xs)]">
                  <label className="main-text text-xs">First name</label>
                  <input
                    type="text"
                    autoComplete="given-name"
                    className={inputClass}
                    {...register("firstName")}
                  />
                  {errors.firstName && (
                    <p className={fieldErrorClass}>{errors.firstName.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-[var(--spacing-xs)]">
                  <label className="main-text text-xs">Last name</label>
                  <input
                    type="text"
                    autoComplete="family-name"
                    className={inputClass}
                    {...register("lastName")}
                  />
                  {errors.lastName && (
                    <p className={fieldErrorClass}>{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-[var(--spacing-xs)]">
                <label className="main-text text-xs">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  className={inputClass}
                  {...register("email")}
                />
                {errors.email && (
                  <p className={fieldErrorClass}>{errors.email.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-[var(--spacing-xs)]">
                <label className="main-text text-xs">Discord handle</label>
                <input
                  type="text"
                  autoComplete="off"
                  className={inputClass}
                  {...register("discordHandle")}
                />
                {errors.discordHandle && (
                  <p className={fieldErrorClass}>
                    {errors.discordHandle.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-[var(--spacing-xs)]">
                <label className="main-text text-xs">Street address</label>
                <input
                  type="text"
                  autoComplete="street-address"
                  className={inputClass}
                  {...register("shippingStreet")}
                />
                {errors.shippingStreet && (
                  <p className={fieldErrorClass}>
                    {errors.shippingStreet.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-[var(--spacing-sm)]">
                <div className="flex flex-col gap-[var(--spacing-xs)]">
                  <label className="main-text text-xs">City</label>
                  <input
                    type="text"
                    autoComplete="address-level2"
                    className={inputClass}
                    {...register("shippingCity")}
                  />
                  {errors.shippingCity && (
                    <p className={fieldErrorClass}>
                      {errors.shippingCity.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-[var(--spacing-xs)]">
                  <label className="main-text text-xs">State</label>
                  <select
                    autoComplete="address-level1"
                    className={`${inputClass} appearance-none`}
                    defaultValue=""
                    {...register("shippingState")}
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    {US_STATES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                  {errors.shippingState && (
                    <p className={fieldErrorClass}>
                      {errors.shippingState.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[var(--spacing-sm)]">
                <div className="flex flex-col gap-[var(--spacing-xs)]">
                  <label className="main-text text-xs">ZIP</label>
                  <input
                    type="text"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    className={inputClass}
                    {...register("shippingZip")}
                  />
                  {errors.shippingZip && (
                    <p className={fieldErrorClass}>
                      {errors.shippingZip.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-[var(--spacing-xs)]">
                  <label className="main-text text-xs">Country</label>
                  <input
                    type="text"
                    value="United States"
                    readOnly
                    aria-readonly
                    tabIndex={-1}
                    className={`${inputClass} opacity-70 cursor-not-allowed`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-[var(--spacing-sm)]">
                <span className="main-text text-xs opacity-70">
                  Total: {priceFormatter.format(cartTotal)}
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="pixel-borders pixel-btn-border px-[var(--spacing-md)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "creating…" : "create order"}
                </button>
              </div>

              {error && (
                <p className="main-text text-xs text-red-400">{error}</p>
              )}
            </form>
          )}

          {step === "success" && (
            <div className="flex flex-col gap-[var(--spacing-md)]">
              <p className="main-text text-sm">Custom order recorded</p>
              {successEmail && (
                <p className="main-text text-xs opacity-70">
                  Receipt sent to {successEmail}.
                </p>
              )}
              {successOrderId && (
                <p className="main-text text-xs opacity-70">
                  Order id: {successOrderId}
                </p>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="pixel-borders pixel-btn-border px-[var(--spacing-md)]"
                >
                  done
                </button>
              </div>
            </div>
          )}
        </CardHeader>
      </DialogContent>
    </Dialog>
  );
}
