"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { ShopItem } from "./types";

type Cart = Record<string, number>;

interface CartContextValue {
  cart: Cart;
  add: (item: ShopItem) => void;
  remove: (itemId: string) => void;
  clear: () => void;
  totalItems: (items: ShopItem[]) => number;
  totalCost: (items: ShopItem[]) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>({});

  const add = useCallback((item: ShopItem) => {
    setCart((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
  }, []);

  const remove = useCallback((itemId: string) => {
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
  }, []);

  const clear = useCallback(() => setCart({}), []);

  const totalItems = useCallback(
    (items: ShopItem[]) => {
      const itemMap = new Map(items.map((i) => [i.id, i]));
      return Object.entries(cart).reduce((sum, [id, qty]) => {
        return itemMap.has(id) ? sum + qty : sum;
      }, 0);
    },
    [cart],
  );

  const totalCost = useCallback(
    (items: ShopItem[]) => {
      const itemMap = new Map(items.map((i) => [i.id, i]));
      return Object.entries(cart).reduce((sum, [id, qty]) => {
        const item = itemMap.get(id);
        return item ? sum + item.price * qty : sum;
      }, 0);
    },
    [cart],
  );

  const value = useMemo<CartContextValue>(
    () => ({ cart, add, remove, clear, totalItems, totalCost }),
    [cart, add, remove, clear, totalItems, totalCost],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
