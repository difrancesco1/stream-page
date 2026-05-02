"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart } from "./cart-context";
import { featuredMedia, type ShopItem } from "./types";

interface ShopSectionProps {
  items: ShopItem[];
}

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default function ShopSection({ items }: ShopSectionProps) {
  const { add } = useCart();

  return (
    <section className="flex flex-col gap-[var(--spacing-xs)] flex-1 min-h-0 w-full">
      <div className="py-2 flex-1 min-h-0 overflow-auto border-b-2">
        <ul className="grid grid-cols-3 justify-items-center gap-4 w-full pt-1">
          {items.map((item) => {
            const featured = featuredMedia(item);
            return (
              <li
                key={item.id}
                className="relative flex flex-col w-[14.65rem]
                  bg-white pixel-borders"
              >
                <Link
                  href={`/shop/${item.slug}`}
                  prefetch
                  aria-label={`View details for ${item.name}`}
                  className="relative w-full aspect-[65/91] cursor-pointer block"
                >
                  {featured?.media_type === "image" && (
                    <Image
                      src={featured.url}
                      alt={item.name}
                      fill
                      className="object-contain"
                    />
                  )}
                  {featured?.media_type === "video" && (
                    <video
                      src={featured.url}
                      muted
                      loop
                      playsInline
                      autoPlay
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  )}
                </Link>
                <div
                  className="border-t-[length:var(--border-width)] border-[color:var(--border)]
                    px-[var(--spacing-sm)]
                    text-center text-[1.2rem] py-2
                    text-[color:var(--border)] leading-none"
                >
                  {priceFormatter.format(item.price)}
                </div>
                <button
                  type="button"
                  aria-label={`Add ${item.name} to cart`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    add(item);
                  }}
                  className="hidden lg:flex absolute -top-2.5 -right-2.5
                    w-7 h-7 items-center justify-center rounded-full
                    bg-[color:var(--accent)] text-[color:var(--background)]
                    border-[length:var(--border-width)] border-[color:var(--border)]
                    text-[1rem] leading-none font-bold
                    hover:bg-[color:var(--accent-shadow)] transition-colors z-10 cursor-pointer "
                >
                  +
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
