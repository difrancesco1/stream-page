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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-full">
          <div
            className="relative w-full aspect-square max-h-[32vh] bg-foreground pixel-borders
              md:aspect-auto md:max-h-none md:h-full"
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

          <div className="min-w-0 flex flex-col gap-[var(--spacing-sm)] md:h-full relative">
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
            <div className="flex justify-between"><span className="main-text !text-[1.5rem]">
                  ${item.price}
                </span>
            <div className=" flex justify-end items-center  text-white px-1">
                <span> {item.quantity > 0 ? "in stock" : "out of stock"} </span>
              </div> </div>
            
            {ordered.length > 1 && (
              <ul className="flex justify-start gap-1">
                {ordered.map((m) => {
                  const isActive = m.id === active?.id;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(m.id)}
                        aria-label="View media item"
                        aria-current={isActive ? "true" : undefined}
                        className={`relative w-[5.75rem] h-[5.75rem] bg-foreground overflow-hidden cursor-pointer transition-opacity ${
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


                
                
                
                <div className="flex flex-col gap-2 items-center absolute bottom-0 left-0 right-0">
                
                <div className="flex items-center gap-2 pixel-borders p-1 justify-center flex w-full">
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col">
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
                </div>
              </div>
              <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!inStock}
                    aria-label={`Add ${item.name} to cart`}
                    className="pixel-borders pixel-btn-border
                      disabled:opacity-50 disabled:cursor-not-allowed
                      cursor-pointer px-3 py-1.5 !text-[0.875rem] w-full"
                  >
                    {inStock ? "Add to cart" : "Out of stock"}
                </button>
                <div className="text-border opacity-30">payments done through paypal </div>
              <div/>
          </div>
          
          
        </div>
        </div>

      </div>
      
    </section>
  );
}
