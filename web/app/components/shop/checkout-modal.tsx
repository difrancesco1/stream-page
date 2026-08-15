"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Dialog, DialogContent } from "@/components/ui/dialog";

import {
  captureCheckoutOrder,
  createCheckoutOrder,
  createCustomOrder,
  type CheckoutCustomerInfo,
} from "@/app/api/shop/checkout-actions";
import { useAuth } from "@/app/context/auth-context";

import { useCart } from "./cart-context";
import {
  checkoutSchema,
  customOrderSchema,
  PICKUP_ALLOWED_STATES,
  type CheckoutFormValues,
  type UsStateCode,
} from "./checkout-schema";
import { computeOrderTotals } from "./pricing";
import type { ShopItem } from "./types";
import CardHeader from "../shared/card-header";
import {
  buildCartLineItems,
  buildCustomizationPayload,
  toCustomerPayload,
} from "./checkout/checkout-helpers";
import FormStep from "./checkout/form-step";
import PayStep from "./checkout/pay-step";
import SuccessStep from "./checkout/success-step";
import { defaultFormValues, type CheckoutMode, type Step } from "./checkout/types";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ShopItem[];
  mode?: CheckoutMode;
}

export default function CheckoutModal({
  open,
  onOpenChange,
  items,
  mode = "customer",
}: CheckoutModalProps) {
  const { cart, customizations, clear } = useCart();
  const { token } = useAuth();

  const isAdmin = mode === "admin";

  const [step, setStep] = useState<Step>("form");
  const [customer, setCustomer] = useState<CheckoutCustomerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [testProcessing, setTestProcessing] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(
      (isAdmin ? customOrderSchema : checkoutSchema) as never,
    ) as Resolver<CheckoutFormValues>,
    defaultValues: defaultFormValues,
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const watchedState = watch("shippingState");
  const watchedMethod = watch("shippingMethod");
  const watchedCountry = watch("shippingCountry");
  const pickupEligible =
    watchedCountry === "US" &&
    typeof watchedState === "string" &&
    PICKUP_ALLOWED_STATES.has(watchedState as UsStateCode);

  useEffect(() => {
    if (isAdmin) return;
    if (!pickupEligible && watchedMethod === "pickup") {
      setValue("shippingMethod", undefined as unknown as CheckoutFormValues["shippingMethod"], {
        shouldValidate: false,
      });
    }
  }, [isAdmin, pickupEligible, watchedMethod, setValue]);

  // Clear the shipping method when the destination country changes so a US
  // method doesn't linger on an international order (and vice versa).
  useEffect(() => {
    if (isAdmin) return;
    setValue(
      "shippingMethod",
      undefined as unknown as CheckoutFormValues["shippingMethod"],
      { shouldValidate: false },
    );
  }, [isAdmin, watchedCountry, setValue]);

  useEffect(() => {
    if (open) {
      setStep("form");
      setCustomer(null);
      setError(null);
      setSuccessOrderId(null);
      setSuccessEmail(null);
      setSubmitting(false);
      setTestProcessing(false);
      reset(defaultFormValues);
    }
  }, [open, reset]);

  const cartLineItems = buildCartLineItems(cart, items);
  const customizationPayload = buildCustomizationPayload(customizations, items);
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const cartSubtotal = cartLineItems.reduce((sum, line) => {
    const item = itemMap.get(line.product_id);
    return item ? sum + item.price * line.quantity : sum;
  }, 0);
  const totals = computeOrderTotals(
    cartSubtotal,
    watchedMethod ?? null,
    watchedState ?? null,
  );

  const onFormSubmit = handleSubmit(async (values) => {
    setError(null);
    if (cartLineItems.length === 0) {
      setError("Your cart is empty");
      return;
    }

    if (isAdmin) {
      if (!token) {
        setError("You must be signed in as the shop admin");
        return;
      }
      setSubmitting(true);
      try {
        const adminCustomer = toCustomerPayload(values, mode);
        const result = await createCustomOrder(
          token,
          cartLineItems,
          adminCustomer,
          customizationPayload,
        );
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
      return;
    }

    setCustomer(toCustomerPayload(values, mode));
    setStep("pay");
  });

  const handleCreatePaypalOrder = async (): Promise<string> => {
    if (!customer) throw new Error("Missing customer info");
    setError(null);
    const result = await createCheckoutOrder(
      cartLineItems,
      customer,
      customizationPayload,
    );
    if (!result.success) {
      setError(result.error);
      throw new Error(result.error);
    }
    return result.paypal_order_id;
  };

  const handleApprovePaypalOrder = async (orderID: string): Promise<void> => {
    if (!customer) return;
    setError(null);
    const result = await captureCheckoutOrder(
      orderID,
      cartLineItems,
      customer,
      customizationPayload,
    );
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (result.status !== "paid") {
      setError(result.message || "Payment was not completed");
      return;
    }
    setSuccessOrderId(result.order_id);
    setSuccessEmail(customer.email);
    clear();
    setStep("success");
  };

  const handleTestPay = async (): Promise<void> => {
    if (!customer) return;
    setError(null);
    setTestProcessing(true);
    try {
      const created = await createCheckoutOrder(
        cartLineItems,
        customer,
        customizationPayload,
      );
      if (!created.success) {
        setError(created.error);
        return;
      }
      const captured = await captureCheckoutOrder(
        created.paypal_order_id,
        cartLineItems,
        customer,
        customizationPayload,
      );
      if (!captured.success) {
        setError(captured.error);
        return;
      }
      if (captured.status !== "paid") {
        setError(captured.message || "Payment was not completed");
        return;
      }
      setSuccessOrderId(captured.order_id);
      setSuccessEmail(customer.email);
      clear();
      setStep("success");
    } finally {
      setTestProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="pixel-borders pixel-card bg-foreground border-[length:var(--border-width)] border-border max-h-[90vh] overflow-y-auto p-[var(--spacing-md)] max-w-[26rem]"
      >
        <CardHeader
          title={isAdmin ? "custom order" : "checkout"}
          exitbtn={false}
          showTabs={false}
          variant="section"
        >
          {step === "form" && (
            <FormStep
              mode={mode}
              register={register}
              control={control}
              errors={errors}
              onSubmit={onFormSubmit}
              pickupEligible={pickupEligible}
              watchedMethod={watchedMethod}
              totals={totals}
              cartSubtotal={cartSubtotal}
              submitting={submitting}
              error={error}
            />
          )}

          {step === "pay" && customer && (
            <PayStep
              customer={customer}
              totals={totals}
              error={error}
              testProcessing={testProcessing}
              onCreateOrder={handleCreatePaypalOrder}
              onApprove={handleApprovePaypalOrder}
              onTestPay={handleTestPay}
              onError={setError}
              onBack={() => setStep("form")}
            />
          )}

          {step === "success" && (
            <SuccessStep
              isAdmin={isAdmin}
              successEmail={successEmail}
              successOrderId={successOrderId}
              onDone={() => onOpenChange(false)}
            />
          )}
        </CardHeader>
      </DialogContent>
    </Dialog>
  );
}
