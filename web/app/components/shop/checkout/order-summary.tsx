import type { CheckoutFormValues } from "../checkout-schema";
import { priceFormatter, type OrderTotals } from "../pricing";
import type { CheckoutMode } from "./types";

interface OrderSummaryProps {
  mode: CheckoutMode;
  totals: OrderTotals;
  watchedMethod: CheckoutFormValues["shippingMethod"] | undefined;
  cartSubtotal: number;
}

export default function OrderSummary({
  mode,
  totals,
  watchedMethod,
  cartSubtotal,
}: OrderSummaryProps) {
  if (mode === "admin") {
    return (
      <span className="main-text text-xs opacity-70">
        Total: {priceFormatter.format(cartSubtotal)}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-xs)] pt-[var(--spacing-sm)] main-text text-xs">
      <div className="flex justify-between opacity-70">
        <span>Subtotal</span>
        <span>{priceFormatter.format(totals.subtotal)}</span>
      </div>
      <div className="flex justify-between opacity-70">
        <span>Shipping</span>
        <span>
          {watchedMethod ? priceFormatter.format(totals.shipping) : "—"}
        </span>
      </div>
      {totals.discount > 0 && (
        <div className="flex justify-between opacity-70">
          <span>Discount</span>
          <span>-{priceFormatter.format(totals.discount)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>Total</span>
        <span>{priceFormatter.format(totals.total)}</span>
      </div>
    </div>
  );
}
