import type { FormEventHandler } from "react";

import type { CheckoutFormValues } from "../checkout-schema";
import type { OrderTotals } from "../pricing";
import CustomerFields from "./customer-fields";
import OrderSummary from "./order-summary";
import ShippingMethodField from "./shipping-method-field";
import {
  FIELD_ERROR_CLASS,
  INPUT_CLASS,
  type CheckoutMode,
  type FieldGroupProps,
} from "./types";

interface FormStepProps extends FieldGroupProps {
  mode: CheckoutMode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  pickupEligible: boolean;
  watchedMethod: CheckoutFormValues["shippingMethod"] | undefined;
  totals: OrderTotals;
  cartSubtotal: number;
  submitting: boolean;
  error: string | null;
}

export default function FormStep({
  mode,
  register,
  control,
  errors,
  onSubmit,
  pickupEligible,
  watchedMethod,
  totals,
  cartSubtotal,
  submitting,
  error,
}: FormStepProps) {
  const isAdmin = mode === "admin";

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-[var(--spacing-sm)]"
    >
      <CustomerFields
        register={register}
        control={control}
        errors={errors}
        enableInternational={!isAdmin}
      />

      {!isAdmin && (
        <ShippingMethodField
          register={register}
          control={control}
          errors={errors}
          pickupEligible={pickupEligible}
        />
      )}

      <div className="flex flex-col gap-[var(--spacing-xs)]">
        <label className="main-text text-xs">
          Notes <span className="opacity-50">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder={
            isAdmin
              ? "Event, payment method, etc."
              : "Anything you'd like us to know?"
          }
          className={`${INPUT_CLASS} resize-y min-h-[3.5rem]`}
          {...register("notes")}
        />
        {errors.notes && (
          <p className={FIELD_ERROR_CLASS}>{errors.notes.message}</p>
        )}
      </div>

      {isAdmin ? (
        <div className="flex items-center justify-between pt-[var(--spacing-sm)]">
          <OrderSummary
            mode={mode}
            totals={totals}
            watchedMethod={watchedMethod}
            cartSubtotal={cartSubtotal}
          />
          <button
            type="submit"
            disabled={submitting}
            className="pixel-borders pixel-btn-border px-[var(--spacing-md)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "creating…" : "create order"}
          </button>
        </div>
      ) : (
        <>
          <OrderSummary
            mode={mode}
            totals={totals}
            watchedMethod={watchedMethod}
            cartSubtotal={cartSubtotal}
          />
          <div className="flex justify-end pt-[var(--spacing-sm)]">
            <button
              type="submit"
              className="pixel-borders pixel-btn-border px-[var(--spacing-md)]"
            >
              continue
            </button>
          </div>
        </>
      )}

      {error && <p className="main-text text-xs text-red-400">{error}</p>}
    </form>
  );
}
