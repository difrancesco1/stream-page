"use client";

import Image from "next/image";

import { featuredMedia, type ShopItem } from "./types";

interface CartSectionProps {
  items: ShopItem[];
  cart: Record<string, number>;
  onRemove?: (itemId: string) => void;
  onPay?: () => void;
}

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function CartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="w-[1rem] h-[1rem] md:w-[1.125rem] md:h-[1.125rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d="M3 4h3l2 12h11l2-8H7" />
      <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function CartSection({
  items,
  cart,
  onRemove,
  onPay,
}: CartSectionProps) {
  const itemMap = new Map(items.map((item) => [item.id, item]));

  const cartEntries = Object.entries(cart)
    .map(([id, qty]) => {
      const item = itemMap.get(id);
      return item ? { item, qty } : null;
    })
    .filter((entry): entry is { item: ShopItem; qty: number } => entry !== null);

  const totalItems = cartEntries.reduce((sum, { qty }) => sum + qty, 0);
  const totalCost = cartEntries.reduce(
    (sum, { item, qty }) => sum + item.price * qty,
    0,
  );

  const isEmpty = totalItems === 0;

  return (
    <section className="flex flex-col gap-[var(--spacing-xs)]">
      <div
        className="bg-background h-[1.5rem] md:h-[1.75rem] px-[var(--spacing-sm)]
          pixel-borders border-accent
          flex items-center justify-between"
      >
        <span className="main-text flex items-center gap-[var(--spacing-xs)]">
          cart
          <CartIcon />
          {totalItems} {totalItems === 1 ? "item" : "items"}
        </span>
        <span className="main-text">USA only &lt;3</span>
      </div>

      <div
        className="pixel-borders p-[var(--spacing-md)]
          flex flex-row items-stretch justify-between gap-[var(--spacing-md)]"
      >
        <div className="flex-1 min-w-0">
          {isEmpty ? (
            <div
              className="h-[3rem] md:h-[3.5rem] flex items-center justify-center
                text-[0.75rem] text-[color:var(--border)] opacity-60"
            >
              Your cart is empty
            </div>
          ) : (
            <ul className="flex flex-row flex-wrap gap-[var(--spacing-sm)]">
              {cartEntries.map(({ item, qty }) => {
                const featured = featuredMedia(item);
                return (
                <li
                  key={item.id}
                  className="relative flex flex-col w-[3.5rem] md:w-[4rem]
                    bg-white pixel-borders"
                  title={`${item.name} (${qty})`}
                >
                  <button
                    type="button"
                    aria-label={`Remove one ${item.name} from cart`}
                    onClick={() => onRemove?.(item.id)}
                    className="relative w-full aspect-square cursor-pointer overflow-hidden"
                  >
                    {featured?.media_type === "image" && (
                      <Image
                        src={featured.url}
                        alt={item.name}
                        fill
                        className="object-contain p-1"
                      />
                    )}
                    {featured?.media_type === "video" && (
                      <video
                        src={featured.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </button>
                  {qty > 1 && (
                    <span
                      className="absolute -bottom-1.5 -right-1.5
                        min-w-5 h-5 px-1 flex items-center justify-center rounded-full
                        bg-[color:var(--accent)] text-[color:var(--background)]
                        border-[length:var(--border-width)] border-[color:var(--border)]
                        text-[0.75rem] leading-none font-bold z-10"
                    >
                      {qty}
                    </span>
                  )}
                </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          className="flex flex-col items-end justify-between
            gap-[var(--spacing-xs)] shrink-0"
        >
          <div className="flex flex-col items-end">
            <span
              className="text-[0.75rem]
                text-[color:var(--border)] opacity-60 leading-none"
            >
              Total
            </span>
            <span className="main-text text-[1rem] md:text-[1.125rem] leading-none">
              {priceFormatter.format(totalCost)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onPay?.()}
            disabled={isEmpty}
            className="pixel-borders pixel-btn-border
              disabled:opacity-50 disabled:cursor-not-allowed
              cursor-pointer px-3 py-1.5 text-[0.875rem]"
          >
            Pay
          </button>
        </div>
      </div>
    </section>
  );
}
