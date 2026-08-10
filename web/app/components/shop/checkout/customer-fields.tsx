import { Controller, useWatch } from "react-hook-form";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  SHIPPING_COUNTRIES,
  SHIPPING_COUNTRY_LABELS,
  US_STATES,
} from "../checkout-schema";
import { FIELD_ERROR_CLASS, INPUT_CLASS, type FieldGroupProps } from "./types";

const INPUT_OVERRIDE = `${INPUT_CLASS} h-auto rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:border-0`;

interface CustomerFieldsProps extends FieldGroupProps {
  enableInternational?: boolean;
}

export default function CustomerFields({
  register,
  control,
  errors,
  enableInternational = false,
}: CustomerFieldsProps) {
  const watchedCountry = useWatch({ control, name: "shippingCountry" });
  const isUS = !enableInternational || watchedCountry === "US";

  return (
    <>
      <div className="grid grid-cols-2 gap-[var(--spacing-sm)]">
        <div className="flex flex-col gap-[var(--spacing-xs)]">
          <label className="main-text text-xs">First name</label>
          <Input
            type="text"
            autoComplete="given-name"
            className={INPUT_OVERRIDE}
            {...register("firstName")}
          />
          {errors.firstName && (
            <p className={FIELD_ERROR_CLASS}>{errors.firstName.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-[var(--spacing-xs)]">
          <label className="main-text text-xs">Last name</label>
          <Input
            type="text"
            autoComplete="family-name"
            className={INPUT_OVERRIDE}
            {...register("lastName")}
          />
          {errors.lastName && (
            <p className={FIELD_ERROR_CLASS}>{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-[var(--spacing-xs)]">
        <label className="main-text text-xs">Email</label>
        <Input
          type="email"
          autoComplete="email"
          className={INPUT_OVERRIDE}
          {...register("email")}
        />
        {errors.email && (
          <p className={FIELD_ERROR_CLASS}>{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-[var(--spacing-xs)]">
        <label className="main-text text-xs">Discord handle</label>
        <Input
          type="text"
          autoComplete="off"
          className={INPUT_OVERRIDE}
          {...register("discordHandle")}
        />
        {errors.discordHandle && (
          <p className={FIELD_ERROR_CLASS}>{errors.discordHandle.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-[var(--spacing-xs)]">
        <label className="main-text text-xs">Street address</label>
        <Input
          type="text"
          autoComplete="street-address"
          className={INPUT_OVERRIDE}
          {...register("shippingStreet")}
        />
        {errors.shippingStreet && (
          <p className={FIELD_ERROR_CLASS}>{errors.shippingStreet.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-[var(--spacing-sm)]">
        <div className="flex flex-col gap-[var(--spacing-xs)]">
          <label className="main-text text-xs">City</label>
          <Input
            type="text"
            autoComplete="address-level2"
            className={INPUT_OVERRIDE}
            {...register("shippingCity")}
          />
          {errors.shippingCity && (
            <p className={FIELD_ERROR_CLASS}>{errors.shippingCity.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-[var(--spacing-xs)]">
          <label className="main-text text-xs">State/Province</label>
          {isUS ? (
            <Controller
              name="shippingState"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger
                    className={`${INPUT_OVERRIDE} w-full justify-between`}
                  >
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000] pixel-borders bg-background main-text text-xs">
                    {US_STATES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          ) : (
            <Input
              type="text"
              autoComplete="address-level1"
              className={INPUT_OVERRIDE}
              {...register("shippingState")}
            />
          )}
          {errors.shippingState && (
            <p className={FIELD_ERROR_CLASS}>{errors.shippingState.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[var(--spacing-sm)]">
        <div className="flex flex-col gap-[var(--spacing-xs)]">
          <label className="main-text text-xs">
            {isUS ? "ZIP" : "Postal code"}
          </label>
          <Input
            type="text"
            autoComplete="postal-code"
            inputMode={isUS ? "numeric" : "text"}
            className={INPUT_OVERRIDE}
            {...register("shippingZip")}
          />
          {errors.shippingZip && (
            <p className={FIELD_ERROR_CLASS}>{errors.shippingZip.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-[var(--spacing-xs)]">
          <label className="main-text text-xs">Country</label>
          {enableInternational ? (
            <Controller
              name="shippingCountry"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    className={`${INPUT_OVERRIDE} w-full justify-between`}
                  >
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000] pixel-borders bg-background main-text text-xs">
                    {SHIPPING_COUNTRIES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {SHIPPING_COUNTRY_LABELS[code]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          ) : (
            <Input
              type="text"
              value="United States"
              readOnly
              aria-readonly
              tabIndex={-1}
              className={`${INPUT_OVERRIDE} opacity-70 cursor-not-allowed`}
            />
          )}
          {errors.shippingCountry && (
            <p className={FIELD_ERROR_CLASS}>{errors.shippingCountry.message}</p>
          )}
        </div>
      </div>
    </>
  );
}
