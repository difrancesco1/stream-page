"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PayPalButtons,
  PayPalScriptProvider,
} from "@paypal/react-paypal-js";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import {
  captureCheckoutOrder,
  createCheckoutOrder,
  type CartLineItem,
  type CheckoutCustomerInfo,
} from "@/app/api/shop/checkout-actions";

import { useCart } from "./cart-context";
import {
  US_STATES,
  checkoutSchema,
  type CheckoutFormValues,
} from "./checkout-schema";
import type { ShopItem } from "./types";
import CardHeader from "../shared/card-header";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ShopItem[];
}

type Step = "customer" | "pay" | "success";

const defaultFormValues: CheckoutFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  shippingStreet: "",
  shippingCity: "",
  shippingState: "",
  shippingZip: "",
};

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
const PAYPAL_TEST_MODE = process.env.NEXT_PUBLIC_PAYPAL_TEST_MODE === "true";

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
    phone: values.phone,
    shipping_street: values.shippingStreet,
    shipping_city: values.shippingCity,
    shipping_state: values.shippingState,
    shipping_zip: values.shippingZip,
    shipping_country: "US",
  };
}

export default function CheckoutModal({
  open,
  onOpenChange,
  items,
}: CheckoutModalProps) {
  const { cart, clear } = useCart();

  const [step, setStep] = useState<Step>("customer");
  const [customer, setCustomer] = useState<CheckoutCustomerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [testProcessing, setTestProcessing] = useState(false);

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
      setStep("customer");
      setCustomer(null);
      setError(null);
      setSuccessOrderId(null);
      setTestProcessing(false);
      reset(defaultFormValues);
    }
  }, [open, reset]);

  const cartLineItems = buildCartLineItems(cart, items);
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const cartTotal = cartLineItems.reduce((sum, line) => {
    const item = itemMap.get(line.product_id);
    return item ? sum + item.price * line.quantity : sum;
  }, 0);

  const onCustomerSubmit = handleSubmit((values) => {
    setError(null);
    if (cartLineItems.length === 0) {
      setError("Your cart is empty");
      return;
    }
    setCustomer(toCustomerPayload(values));
    setStep("pay");
  });

  const sdkConfigured = PAYPAL_CLIENT_ID.length > 0;

  const inputClass =
    "p-[var(--spacing-sm)] pixel-borders bg-background main-text text-xs";
  const fieldErrorClass = "main-text text-[10px] text-red-400";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="pixel-borders pixel-card bg-foreground border-[length:var(--border-width)] border-border max-h-[90vh] overflow-y-auto p-[var(--spacing-md)] max-w-[26rem]"
      >
        <CardHeader title="checkout" exitbtn={true} showTabs={false}>
        

        {step === "customer" && (
          <form
            onSubmit={onCustomerSubmit}
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
              <label className="main-text text-xs">Phone</label>
              <input
                type="tel"
                autoComplete="tel"
                className={inputClass}
                {...register("phone")}
              />
              {errors.phone && (
                <p className={fieldErrorClass}>{errors.phone.message}</p>
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
                className="pixel-borders pixel-btn-border px-[var(--spacing-md)]"
              >
                continue
              </button>
            </div>

            {error && (
              <p className="main-text text-xs text-red-400">{error}</p>
            )}
          </form>
        )}

        {step === "pay" && customer && (
          <div className="flex flex-col gap-[var(--spacing-md)]">
            <div className="main-text text-xs opacity-70">
              Paying {priceFormatter.format(cartTotal)} as {customer.email}
            </div>

            {PAYPAL_TEST_MODE ? (
              <div className="flex flex-col gap-[var(--spacing-sm)]">
                <p className="main-text text-xs text-yellow-400">
                  Test mode — no real payment will be processed.
                </p>
                <button
                  type="button"
                  disabled={testProcessing}
                  onClick={async () => {
                    setError(null);
                    setTestProcessing(true);
                    try {
                      const created = await createCheckoutOrder(
                        cartLineItems,
                        customer,
                      );
                      if (!created.success) {
                        setError(created.error);
                        return;
                      }
                      const captured = await captureCheckoutOrder(
                        created.paypal_order_id,
                      );
                      if (!captured.success) {
                        setError(captured.error);
                        return;
                      }
                      if (captured.status !== "completed") {
                        setError(
                          captured.message || "Payment was not completed",
                        );
                        return;
                      }
                      setSuccessOrderId(captured.order_id);
                      clear();
                      setStep("success");
                    } finally {
                      setTestProcessing(false);
                    }
                  }}
                  className="pixel-borders pixel-btn-border px-[var(--spacing-md)] py-[var(--spacing-sm)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testProcessing ? "processing…" : "pay (test mode)"}
                </button>
              </div>
            ) : sdkConfigured ? (
              <PayPalScriptProvider
                options={{
                  clientId: PAYPAL_CLIENT_ID,
                  currency: "USD",
                  intent: "capture",
                }}
              >
                <PayPalButtons
                  style={{ layout: "vertical" }}
                  createOrder={async () => {
                    setError(null);
                    const result = await createCheckoutOrder(
                      cartLineItems,
                      customer,
                    );
                    if (!result.success) {
                      setError(result.error);
                      throw new Error(result.error);
                    }
                    return result.paypal_order_id;
                  }}
                  onApprove={async (data) => {
                    setError(null);
                    const result = await captureCheckoutOrder(data.orderID);
                    if (!result.success) {
                      setError(result.error);
                      return;
                    }
                    if (result.status !== "completed") {
                      setError(
                        result.message || "Payment was not completed",
                      );
                      return;
                    }
                    setSuccessOrderId(result.order_id);
                    clear();
                    setStep("success");
                  }}
                  onError={(err) => {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Something went wrong with PayPal",
                    );
                  }}
                />
              </PayPalScriptProvider>
            ) : (
              <p className="main-text text-xs text-red-400">
                PayPal client id is not configured. Set
                NEXT_PUBLIC_PAYPAL_CLIENT_ID and reload.
              </p>
            )}

            {error && (
              <p className="main-text text-xs text-red-400">{error}</p>
            )}

            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setStep("customer")}
                className="pixel-btn text-xs"
              >
                back
              </button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col gap-[var(--spacing-md)]">
            <p className="main-text text-sm">Payment successful</p>
            {customer && (
              <p className="main-text text-xs opacity-70">
                We sent a confirmation to {customer.email}.
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
