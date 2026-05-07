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
      <div className="pt-1 flex-1 min-h-0 overflow-auto border-b-2">
        <ul className="grid lg:grid-cols-4 md:grid-cols-3 grid-cols-2 justify-items-center items-start gap-2 w-full">
          {items.map((item) => {
            const featured = featuredMedia(item);
            const category = item.category;
            return (
              <li
                key={item.id}
                className="relative flex flex-col w-[90%] bg-foreground pixel-borders self-start"
              >
                <Link
                  href={`/shop/${item.slug}`}
                  prefetch
                  aria-label={`View details for ${item.name}`}
                  className={`relative w-full cursor-pointer block ${
                    category !== "tokens" ? "aspect-[3/2]" : "aspect-[65/91]"
                  }`}
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
                    text-center text-[1.2rem] py-1 bg-border
                    text-[color:var(--white)] leading-none"
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
                  className="lg:flex absolute top-1 right-1
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
