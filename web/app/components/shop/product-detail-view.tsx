"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { useCart } from "./cart-context";
import { sortedMedia, type ProductMedia, type ShopItem } from "./types";

interface ProductDetailViewProps {
  item: ShopItem;
}

export default function ProductDetailView({ item }: ProductDetailViewProps) {
  const { add } = useCart();
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
    for (let i = 0; i < clampedQty; i++) add(item);
  };

  return (
    <section className="flex flex-col gap-[var(--spacing-sm)] flex-1 min-h-0 w-full">
      <div className="pixel-borders flex-1 min-h-0 overflow-auto p-[var(--spacing-sm)]">
        <div className="sm:grid-cols-1 md:grid md:grid-cols-2 lg:grid-cols-2 lg:grid gap-2 h-full">
          <div className="flex gap-2 w-full md:flex-row lg:flex-row sm:flex-col h-full">
            <div
              className="relative w-full flex-1 min-h-0 h-full
                bg-white pixel-borders"
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

          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-[var(--spacing-sm)] h-full">
            <div className="flex flex-col">
              <h1 className="main-text !text-[1.325rem] leading-tight">
                {item.name}
              </h1>
              <p
                className="text-[0.8125rem] text-[color:var(--border)]
                  whitespace-pre-wrap"
              >
                {item.description?.trim() || "No description available."}
              </p>

            </div>

            {ordered.length > 1 && (
              <ul className="flex justify-start">
                {ordered.map((m) => {
                  const isActive = m.id === active?.id;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(m.id)}
                        aria-label="View media item"
                        aria-current={isActive ? "true" : undefined}
                        className={`relative w-[5.75rem] h-[5.75rem] bg-white overflow-hidden cursor-pointer transition-opacity ${
                          isActive
                            ? "opacity-100 pixel-borders-accent"
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

            <div className="pixel-borders">
              <div className="flex justify-between items-center px-2">
                <span className="main-text !text-[1.5rem]">
                  ${item.price}
                </span>
                <span> In stock: ${item.quantity}</span>
              </div> 
               <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={decrement}
                    disabled={!inStock || clampedQty <= 1}
                    aria-label="Decrease quantity"
                    className="pixel-borders pixel-btn-border
                      disabled:opacity-50 disabled:cursor-not-allowed
                      cursor-pointer px-2 py-1.5 text-[0.875rem] leading-none"
                  >
                    -
                  </button>
                  <span
                    aria-live="polite"
                    aria-label="Quantity"
                    className="main-text text-[0.875rem] min-w-[1.5rem] text-center"
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
                      cursor-pointer px-2 py-1.5 text-[0.875rem] leading-none"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!inStock}
                  aria-label={`Add ${item.name} to cart`}
                  className="pixel-borders pixel-btn-border
                    disabled:opacity-50 disabled:cursor-not-allowed
                    cursor-pointer px-3 py-1.5 text-[0.875rem]"
                >
                  {inStock ? "Add to cart" : "Out of stock"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
