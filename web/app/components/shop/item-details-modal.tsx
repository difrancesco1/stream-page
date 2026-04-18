"use client";

import Image from "next/image";

import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ShopItem } from "./types";

interface ItemDetailsModalProps {
  item: ShopItem;
  onAddToCart?: (item: ShopItem) => void;
}

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default function ItemDetailsModal({
  item,
  onAddToCart,
}: ItemDetailsModalProps) {
  const inStock = item.quantity > 0;

  return (
    <div className="flex flex-col gap-[var(--spacing-sm)] p-[var(--spacing-xs)]">
      <DialogHeader className="gap-[var(--spacing-xs)]">
        <DialogTitle className="main-text text-[1rem] md:text-[1.125rem]">
          {item.name}
        </DialogTitle>
        <div className="flex items-center gap-[var(--spacing-sm)] text-[0.75rem] opacity-80">
          <span className="pixel-borders px-[var(--spacing-sm)] py-[2px] bg-background text-[color:var(--border)] uppercase tracking-wide">
            {item.category}
          </span>
          <span
            className={
              inStock
                ? "text-[color:var(--border)]"
                : "text-[color:var(--accent)]"
            }
          >
            {inStock ? `In stock: ${item.quantity}` : "Out of stock"}
          </span>
        </div>
      </DialogHeader>

      <div className="flex flex-col sm:flex-row gap-[var(--spacing-md)]">
        <div
          className="relative w-full sm:w-[10rem] md:w-[12rem] aspect-square
            bg-white pixel-borders shrink-0"
        >
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className="object-contain p-2"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[color:var(--border)] opacity-50 text-[0.75rem]">
              No image
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-[var(--spacing-sm)]">
          <div className="flex flex-col">
            <span className="text-[0.75rem] text-[color:var(--border)] opacity-60 leading-none">
              Price
            </span>
            <span className="main-text text-[1.25rem] md:text-[1.5rem] leading-none">
              {priceFormatter.format(item.price)}
            </span>
          </div>

          <DialogDescription
            className="text-[0.8125rem] text-[color:var(--border)] leading-snug
              whitespace-pre-wrap"
          >
            {item.description?.trim() || "No description available."}
          </DialogDescription>
        </div>
      </div>

      <DialogFooter className="mt-[var(--spacing-xs)]">
        <DialogClose asChild>
          <button
            type="button"
            onClick={() => onAddToCart?.(item)}
            disabled={!inStock}
            aria-label={`Add ${item.name} to cart`}
            className="pixel-borders pixel-btn-border
              disabled:opacity-50 disabled:cursor-not-allowed
              cursor-pointer px-3 py-1.5 text-[0.875rem]"
          >
            {inStock ? "Add to cart" : "Out of stock"}
          </button>
        </DialogClose>
      </DialogFooter>
    </div>
  );
}
