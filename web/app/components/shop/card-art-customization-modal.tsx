"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import { useCart } from "./cart-context";
import type { ShopItem } from "./types";
import CardHeader from "../shared/card-header";

const customizationSchema = z.object({
  cardName: z
    .string()
    .trim()
    .min(1, "Tell me which card you want")
    .max(200, "Card name is too long"),
  description: z
    .string()
    .trim()
    .min(1, "Tell me what you'd like drawn")
    .max(2000, "Description is too long"),
});

type CustomizationFormValues = z.infer<typeof customizationSchema>;

const defaultValues: CustomizationFormValues = {
  cardName: "",
  description: "",
};

interface CustomizationModalContextValue {
  requestCustomization: (item: ShopItem) => void;
}

const CustomizationModalContext =
  createContext<CustomizationModalContextValue | null>(null);

export function useCardArtCustomizationModal(): CustomizationModalContextValue {
  const ctx = useContext(CustomizationModalContext);
  if (!ctx) {
    throw new Error(
      "useCardArtCustomizationModal must be used within CardArtCustomizationProvider",
    );
  }
  return ctx;
}

export function CardArtCustomizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { addCustomization } = useCart();
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<ShopItem | null>(null);

  const requestCustomization = useCallback((next: ShopItem) => {
    setItem(next);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ requestCustomization }), [requestCustomization]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomizationFormValues>({
    resolver: zodResolver(
      customizationSchema as never,
    ) as Resolver<CustomizationFormValues>,
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit((values) => {
    if (!item) return;
    addCustomization(item, {
      cardName: values.cardName.trim(),
      description: values.description.trim(),
    });
    setOpen(false);
  });

  const inputClass =
    "p-[var(--spacing-sm)] pixel-borders bg-background main-text text-xs";
  const fieldErrorClass = "main-text text-[10px] text-red-400";

  return (
    <CustomizationModalContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={true}
          className="pixel-borders pixel-card bg-foreground border-[length:var(--border-width)] border-border max-h-[90vh] overflow-y-auto p-[var(--spacing-md)] max-w-[26rem]"
        >
          <CardHeader title="custom card art" exitbtn={true} showTabs={false}>
            <DialogTitle className="sr-only">
              Custom card art request
            </DialogTitle>

            <form
              onSubmit={onSubmit}
              noValidate
              className="flex flex-col gap-[var(--spacing-sm)]"
            >
              {item && (
                <p className="main-text text-xs opacity-70">
                  {item.name} · ${item.price}
                </p>
              )}

              <div className="flex flex-col gap-[var(--spacing-xs)]">
                <label className="main-text text-xs">Which card?</label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Spirit of Fire, Guo jia level 1"
                  className={inputClass}
                  {...register("cardName")}
                />
                {errors.cardName && (
                  <p className={fieldErrorClass}>{errors.cardName.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-[var(--spacing-xs)]">
                <label className="main-text text-xs">
                  What should I draw?
                </label>
                <textarea
                  rows={5}
                  placeholder="Describe the art you'd like - champion, action, pose, etc."
                  className={`${inputClass} resize-y min-h-[5rem]`}
                  {...register("description")}
                />
                {errors.description && (
                  <p className={fieldErrorClass}>
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-[var(--spacing-sm)]">
                <button
                  type="submit"
                  disabled={!item || (item?.quantity ?? 0) <= 0}
                  className="pixel-borders pixel-btn-border px-[var(--spacing-md)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  add to cart
                </button>
              </div>
            </form>
          </CardHeader>
        </DialogContent>
      </Dialog>
    </CustomizationModalContext.Provider>
  );
}
