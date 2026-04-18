"use client";

import Image from "next/image";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import Topbar from "../shared/topbar";
import ItemDetailsModal from "./item-details-modal";
import type { ShopItem } from "./types";

interface ShopSectionProps {
  title: string;
  items: ShopItem[];
  onAddToCart?: (item: ShopItem) => void;
}

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default function ShopSection({
  title,
  items,
  onAddToCart,
}: ShopSectionProps) {
  return (
    <section className="flex flex-col gap-[var(--spacing-xs)] flex-1 min-h-0">
      <Topbar title={title} />
      <div className="flex-1 min-h-0 pixel-borders p-[var(--spacing-md)] overflow-auto">
        <ul className="flex flex-row flex-wrap gap-[var(--spacing-md)]">
          {items.map((item) => (
            <HoverCard key={item.id} openDelay={150} closeDelay={80}>
              <HoverCardTrigger asChild>
                <li
                  className="relative flex flex-col w-[5.5rem] sm:w-[5.5rem] md:w-[6rem] lg:w-[6.5rem]
                    bg-white pixel-borders"
                >
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        aria-label={`View details for ${item.name}`}
                        className="relative w-full aspect-square cursor-pointer"
                      >
                        {item.image_url && (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-contain p-1"
                          />
                        )}
                      </button>
                    </DialogTrigger>
                    <DialogContent className="pixel-borders bg-foreground">
                      <ItemDetailsModal item={item} onAddToCart={onAddToCart} />
                    </DialogContent>
                  </Dialog>
                  <div
                    className="border-t-[length:var(--border-width)] border-[color:var(--border)]
                      px-[var(--spacing-sm)] py-[var(--spacing-xs)]
                      text-center text-[0.75rem] md:text-[0.75rem]
                      text-[color:var(--border)] leading-none"
                  >
                    {priceFormatter.format(item.price)}
                  </div>
                  <button
                    type="button"
                    aria-label={`Add ${item.name} to cart`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart?.(item);
                    }}
                    className="hidden lg:flex absolute -top-1.5 -right-1.5
                      w-5 h-5 items-center justify-center rounded-full
                      bg-[color:var(--accent)] text-[color:var(--background)]
                      border-[length:var(--border-width)] border-[color:var(--border)]
                      text-[0.75rem] leading-none font-bold
                      hover:bg-[color:var(--accent-shadow)] transition-colors z-10 cursor-pointer"
                  >
                    +
                  </button>
                </li>
              </HoverCardTrigger>
              <HoverCardContent
                side="top"
                align="center"
                className="pixel-borders bg-foreground w-64
                  flex flex-col gap-[var(--spacing-xs)]"
              >
                <div className="main-text text-[0.875rem] leading-tight">
                  {item.name}
                </div>
                <div className="text-[0.75rem] text-[color:var(--border)] opacity-80 leading-snug">
                  {item.description?.trim() || "No description available."}
                </div>
              </HoverCardContent>
            </HoverCard>
          ))}
        </ul>
      </div>
    </section>
  );
}
