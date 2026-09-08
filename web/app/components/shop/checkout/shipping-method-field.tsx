import { useWatch } from "react-hook-form";

import {
  INTERNATIONAL_SHIPPING_COST,
  NO_TRACKING_COST,
  PICKUP_DISCOUNT_RATE,
  TRACKING_COST,
  priceFormatter,
} from "../pricing";
import { FIELD_ERROR_CLASS, type FieldGroupProps } from "./types";

interface ShippingMethodFieldProps extends FieldGroupProps {
  pickupEligible: boolean;
  freeShippingApplied?: boolean;
}

export default function ShippingMethodField({
  register,
  control,
  errors,
  pickupEligible,
  freeShippingApplied = false,
}: ShippingMethodFieldProps) {
  const watchedCountry = useWatch({ control, name: "shippingCountry" });
  const isUS = watchedCountry === "US";

  return (
    <fieldset className="flex flex-col gap-[var(--spacing-xs)]">
      <legend className="main-text text-xs">Shipping</legend>
      {isUS ? (
        <>
          <label className="main-text text-xs flex items-center gap-[var(--spacing-sm)]">
            <input
              type="radio"
              value="tracking"
              {...register("shippingMethod")}
            />
            <span>
              Tracking{" "}
              <span className="opacity-70">
                {freeShippingApplied
                  ? "(free)"
                  : `(+${priceFormatter.format(TRACKING_COST)})`}
              </span>
            </span>
          </label>
          <label className="main-text text-xs flex items-center gap-[var(--spacing-sm)]">
            <input
              type="radio"
              value="no_tracking"
              {...register("shippingMethod")}
            />
            <span>
              No tracking{" "}
              <span className="opacity-70">
                {freeShippingApplied
                  ? "(free)"
                  : `(+${priceFormatter.format(NO_TRACKING_COST)})`}
              </span>
            </span>
          </label>
          {pickupEligible ? (
            <label className="main-text text-xs flex items-center gap-[var(--spacing-sm)]">
              <input
                type="radio"
                value="pickup"
                {...register("shippingMethod")}
              />
              <span>
                Local pickup (WA){" "}
                <span className="opacity-70">
                  (free, {Math.round(PICKUP_DISCOUNT_RATE * 100)}% off)
                </span>
              </span>
            </label>
          ) : (
            <p className="main-text text-[10px] opacity-50">
              Local pickup is available for WA addresses.
            </p>
          )}
        </>
      ) : (
        <>
          <label className="main-text text-xs flex items-center gap-[var(--spacing-sm)]">
            <input
              type="radio"
              value="international"
              {...register("shippingMethod")}
            />
            <span>
              International shipping{" "}
              <span className="opacity-70">
                {freeShippingApplied
                  ? "(free)"
                  : `(${priceFormatter.format(INTERNATIONAL_SHIPPING_COST)} flat)`}
              </span>
            </span>
          </label>
          <p className="main-text text-[10px] opacity-50">
            Shipping takes 2-4 weeks for international orders.
          </p>
        </>
      )}
      {errors.shippingMethod && (
        <p className={FIELD_ERROR_CLASS}>{errors.shippingMethod.message}</p>
      )}
    </fieldset>
  );
}
