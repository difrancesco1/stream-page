"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { useCardArtCustomizationModal } from "./card-art-customization-modal";
import { useCart } from "./cart-context";
import { sortedMedia, type ProductMedia, type ShopItem } from "./types";

interface ProductDetailViewProps {
  item: ShopItem;
}

export default function ProductDetailView({ item }: ProductDetailViewProps) {
  const { add } = useCart();
  const { requestCustomization } = useCardArtCustomizationModal();
  const isCustom = item.category === "custom";
  const inStock = item.quantity > 0;
  const ordered = useMemo(() => sortedMedia(item.media), [item.media]);
  const [activeId, setActiveId] = useState<string | null>(
    ordered[0]?.id ?? null,
  );
  const active: ProductMedia | null =
    ordered.find((m) => m.id === activeId) ?? ordered[0] ?? null;

  const [qty, setQty] = useState(1);
  const maxQty = Math.max(1, item.quantity);
  const clampedQty = Math.min(Math.max(qty, 1), maxQty);
  const decrement = () => setQty((q) => Math.max(1, q - 1));
  const increment = () => setQty((q) => Math.min(maxQty, q + 1));
  const handleAdd = () => {
    if (isCustom) {
      requestCustomization(item);
      return;
    }
    for (let i = 0; i < clampedQty; i++) add(item);
  };

  return (
    <section className="flex flex-col gap-[var(--spacing-sm)] flex-1 min-h-0 w-full">
      <div className="pixel-borders flex-1 min-h-0 overflow-hidden p-[var(--spacing-sm)]">
        <div className="flex flex-col md:grid md:grid-cols-2 gap-2 h-full min-h-0">
          <div
            className="relative w-full bg-foreground pixel-borders
              flex-1 min-h-0 md:flex-none md:h-full md:aspect-auto"
          >
            {active ? (
              active.media_type === "image" ? (
                <Image
                  src={active.url}
                  alt={item.name}
                  fill
                  className="object-contain p-2"
                />
              ) : (
                <video
                  key={active.id}
                  src={active.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 w-full h-full object-contain p-1 bg-black"
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[color:var(--border)] opacity-50 text-[0.75rem]">
                No media
              </div>
            )}
          </div>

          <div className="min-w-0 flex flex-col gap-[var(--spacing-sm)] md:h-full shrink-0 min-h-0">
            <div className="flex flex-col min-h-0">
              <h1 className="main-text !text-[1.325rem] leading-tight">
                {item.name}
              </h1>
              <p
                className="text-[0.8125rem] text-[color:var(--border)]
                  whitespace-pre-wrap overflow-auto min-h-0"
              >
                {item.description?.trim() || "No description available."}
              </p>
            </div>

            <div className="flex justify-between items-center">
              <span className="main-text !text-[1.5rem]">${item.price}</span>
              <div className="flex justify-end items-center text-white px-1">
                <span>{item.quantity > 0 ? "in stock" : "out of stock"}</span>
              </div>
            </div>

            {ordered.length > 1 && (
              <ul className="flex flex-wrap justify-start gap-1">
                {ordered.map((m) => {
                  const isActive = m.id === active?.id;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(m.id)}
                        aria-label="View media item"
                        aria-current={isActive ? "true" : undefined}
                        className={`relative w-[3.5rem] h-[3.5rem] md:w-[5.75rem] md:h-[5.75rem] bg-foreground overflow-hidden cursor-pointer transition-opacity ${
                          isActive
                            ? "opacity-100 pixel-borders-accent bg-white"
                            : "opacity-60 hover:opacity-90 pixel-borders"
                        }`}
                      >
                        {m.media_type === "image" ? (
                          <Image
                            src={m.url}
                            alt=""
                            fill
                            className="object-contain p-1"
                          />
                        ) : (
                          <video
                            src={m.url}
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-auto flex flex-col gap-2 items-center w-full">
              {!isCustom && (
                <div className="flex items-center gap-2 pixel-borders p-1 justify-center w-full">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={decrement}
                      disabled={!inStock || clampedQty <= 1}
                      aria-label="Decrease quantity"
                      className="pixel-borders pixel-btn-border
                        disabled:opacity-50 disabled:cursor-not-allowed
                        cursor-pointer px-2 py-1.5 !text-[1rem] leading-none"
                    >
                      -
                    </button>
                    <span
                      aria-live="polite"
                      aria-label="Quantity"
                      className="main-text min-w-[1.5rem] text-center"
                    >
                      {clampedQty}
                    </span>
                    <button
                      type="button"
                      onClick={increment}
                      disabled={!inStock || clampedQty >= maxQty}
                      aria-label="Increase quantity"
                      className="pixel-borders pixel-btn-border
                        disabled:opacity-50 disabled:cursor-not-allowed
                        cursor-pointer px-2 py-1.5 !text-[1rem] leading-none"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleAdd}
                disabled={!inStock}
                aria-label={`Add ${item.name} to cart`}
                className="pixel-borders pixel-btn-border
                  disabled:opacity-50 disabled:cursor-not-allowed
                  cursor-pointer px-3 py-1.5 !text-[0.875rem] w-full"
              >
                {inStock
                  ? isCustom
                    ? "Customize & add to cart"
                    : "Add to cart"
                  : "Out of stock"}
              </button>
              <div className="text-border opacity-30 text-[0.75rem]">
                payments done through paypal
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
