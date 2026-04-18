"use client";

import { useState } from "react";

import CartSection from "./cart-section";
import ShopSection from "./shop-section";
import type { ShopItem } from "./types";

interface ShopModalProps {
  items: ShopItem[];
}

export default function ShopModal({ items }: ShopModalProps) {
  const [cart, setCart] = useState<Record<string, number>>({});

  const handleAdd = (item: ShopItem) => {
    setCart((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
  };

  const handleRemove = (itemId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      const current = next[itemId] ?? 0;
      if (current <= 1) {
        delete next[itemId];
      } else {
        next[itemId] = current - 1;
      }
      return next;
    });
  };

  const handlePay = () => {
    // TODO: open customer-info modal and POST /shop/orders/create
    console.log("pay", cart);
  };

  const sections: { category: string; items: ShopItem[] }[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last?.category === item.category) {
      last.items.push(item);
    } else {
      sections.push({ category: item.category, items: [item] });
    }
  }

  return (
    <div
      className="relative pixel-borders pixel-card w-full
      sm:max-w-[26rem] md:max-w-[30rem] lg:max-w-[34rem]
      h-auto min-h-[70dvh] sm:min-h-[18rem] md:min-h-[20rem]
      bg-foreground flex flex-col gap-[var(--spacing-sm)] p-[var(--spacing-sm)]"
    >
      {sections.map((section) => (
        <ShopSection
          key={section.category}
          title={section.category}
          items={section.items}
          onAddToCart={handleAdd}
        />
      ))}
      <CartSection
        items={items}
        cart={cart}
        onRemove={handleRemove}
        onPay={handlePay}
      />
    </div>
  );
}
