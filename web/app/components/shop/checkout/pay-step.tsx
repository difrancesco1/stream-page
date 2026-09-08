import { useState } from "react";
import {
  PayPalButtons,
  PayPalScriptProvider,
} from "@paypal/react-paypal-js";

import type { CheckoutCustomerInfo } from "@/app/api/shop/checkout-actions";

import { priceFormatter, type OrderTotals } from "../pricing";
import StripePayment, { type StripeIntentResult } from "./stripe-payment";

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
const PAYPAL_TEST_MODE = process.env.NEXT_PUBLIC_PAYPAL_TEST_MODE === "true";

type PayMethod = "paypal" | "card";

interface PayStepProps {
  customer: CheckoutCustomerInfo;
  totals: OrderTotals;
  error: string | null;
  testProcessing: boolean;
  onCreateOrder: () => Promise<string>;
  onApprove: (orderID: string) => Promise<void>;
  onTestPay: () => Promise<void>;
  onCreateStripeIntent: () => Promise<StripeIntentResult>;
  onFinalizeStripe: (paymentIntentId: string) => Promise<void>;
  onError: (message: string) => void;
  onBack: () => void;
}

export default function PayStep({
  customer,
  totals,
  error,
  testProcessing,
  onCreateOrder,
  onApprove,
  onTestPay,
  onCreateStripeIntent,
  onFinalizeStripe,
  onError,
  onBack,
}: PayStepProps) {
  const [method, setMethod] = useState<PayMethod>("paypal");
  const paypalConfigured = PAYPAL_CLIENT_ID.length > 0;

  return (
    <div className="flex flex-col gap-[var(--spacing-md)]">
      <div className="main-text text-xs opacity-70">
        Paying {priceFormatter.format(totals.total)} as {customer.email}
      </div>

      <div className="flex gap-[var(--spacing-sm)]">
        <button
          type="button"
          onClick={() => setMethod("paypal")}
          className={`pixel-btn text-xs flex-1 ${method === "paypal" ? "" : "opacity-50"}`}
        >
          PayPal
        </button>
        <button
          type="button"
          onClick={() => setMethod("card")}
          className={`pixel-btn text-xs flex-1 ${method === "card" ? "" : "opacity-50"}`}
        >
          Stripe
        </button>
      </div>

      {method === "paypal" ? (
        PAYPAL_TEST_MODE ? (
          <div className="flex flex-col gap-[var(--spacing-sm)]">
            <p className="main-text text-xs text-yellow-400">
              Test mode — no real payment will be processed.
            </p>
            <button
              type="button"
              disabled={testProcessing}
              onClick={onTestPay}
              className="pixel-borders pixel-btn-border px-[var(--spacing-md)] py-[var(--spacing-sm)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testProcessing ? "processing…" : "pay (test mode)"}
            </button>
          </div>
        ) : paypalConfigured ? (
          <PayPalScriptProvider
            options={{
              clientId: PAYPAL_CLIENT_ID,
              currency: "USD",
              intent: "capture",
            }}
          >
            <PayPalButtons
              style={{ layout: "vertical" }}
              createOrder={onCreateOrder}
              onApprove={async (data) => {
                await onApprove(data.orderID);
              }}
              onError={(err) => {
                onError(
                  err instanceof Error
                    ? err.message
                    : "Something went wrong with PayPal",
                );
              }}
            />
          </PayPalScriptProvider>
        ) : (
          <p className="main-text text-xs text-red-400">
            PayPal client id is not configured. Set NEXT_PUBLIC_PAYPAL_CLIENT_ID
            and reload.
          </p>
        )
      ) : (
        <StripePayment
          amountCents={Math.round(totals.total * 100)}
          onCreateIntent={onCreateStripeIntent}
          onFinalize={onFinalizeStripe}
          onError={onError}
        />
      )}

      {error && <p className="main-text text-xs text-red-400">{error}</p>}

      <div className="flex justify-start">
        <button type="button" onClick={onBack} className="pixel-btn text-xs">
          back
        </button>
      </div>
    </div>
  );
}
