"use client";

import { useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

// loadStripe returns a promise we want to create only once per page load.
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(): Promise<Stripe | null> | null {
  if (!STRIPE_PUBLISHABLE_KEY) return null;
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
}

export interface StripeIntentResult {
  paymentIntentId: string;
  clientSecret: string;
}

interface StripePaymentProps {
  amountCents: number;
  onCreateIntent: () => Promise<StripeIntentResult>;
  onFinalize: (paymentIntentId: string) => Promise<void>;
  onError: (message: string) => void;
}

function StripeCheckoutForm({
  onCreateIntent,
  onFinalize,
  onError,
}: Omit<StripePaymentProps, "amountCents">) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    try {
      // Validate the PaymentElement before creating the intent server-side.
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message || "Please check your card details");
        return;
      }

      const intent = await onCreateIntent();

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: intent.clientSecret,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Payment could not be completed");
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        await onFinalize(intent.paymentIntentId);
        return;
      }

      onError("Payment was not completed");
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Something went wrong with Stripe",
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-[var(--spacing-md)]">
      <PaymentElement />
      <button
        type="button"
        disabled={!stripe || processing}
        onClick={handlePay}
        className="pixel-borders pixel-btn-border px-[var(--spacing-md)] py-[var(--spacing-sm)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? "processing…" : "pay with card"}
      </button>
    </div>
  );
}

export default function StripePayment({
  amountCents,
  onCreateIntent,
  onFinalize,
  onError,
}: StripePaymentProps) {
  const stripe = getStripe();

  if (!stripe) {
    return (
      <p className="main-text text-xs text-red-400">
        Stripe publishable key is not configured. Set
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and reload.
      </p>
    );
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        mode: "payment",
        amount: amountCents,
        currency: "usd",
      }}
    >
      <StripeCheckoutForm
        onCreateIntent={onCreateIntent}
        onFinalize={onFinalize}
        onError={onError}
      />
    </Elements>
  );
}
