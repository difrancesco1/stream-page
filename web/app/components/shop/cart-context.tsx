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

export type CartCustomization = {
  uid: string;
  productId: string;
  cardName: string;
  description: string;
};

interface CartContextValue {
  cart: Cart;
  customizations: CartCustomization[];
  add: (item: ShopItem) => void;
  remove: (itemId: string) => void;
  addCustomization: (
    item: ShopItem,
    fields: { cardName: string; description: string },
  ) => void;
  removeCustomization: (uid: string) => void;
  clear: () => void;
  totalItems: (items: ShopItem[]) => number;
  totalCost: (items: ShopItem[]) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

function makeUid(): string {
  if (
    typeof globalThis !== "undefined" &&
    typeof globalThis.crypto?.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `cust-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>({});
  const [customizations, setCustomizations] = useState<CartCustomization[]>([]);

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

  const addCustomization = useCallback(
    (item: ShopItem, fields: { cardName: string; description: string }) => {
      const uid = makeUid();
      setCustomizations((prev) => [
        ...prev,
        {
          uid,
          productId: item.id,
          cardName: fields.cardName,
          description: fields.description,
        },
      ]);
      setCart((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
    },
    [],
  );

  const removeCustomization = useCallback((uid: string) => {
    setCustomizations((prev) => {
      const target = prev.find((c) => c.uid === uid);
      if (!target) return prev;
      setCart((cartPrev) => {
        const next = { ...cartPrev };
        const current = next[target.productId] ?? 0;
        if (current <= 1) {
          delete next[target.productId];
        } else {
          next[target.productId] = current - 1;
        }
        return next;
      });
      return prev.filter((c) => c.uid !== uid);
    });
  }, []);

  const clear = useCallback(() => {
    setCart({});
    setCustomizations([]);
  }, []);

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
    () => ({
      cart,
      customizations,
      add,
      remove,
      addCustomization,
      removeCustomization,
      clear,
      totalItems,
      totalCost,
    }),
    [
      cart,
      customizations,
      add,
      remove,
      addCustomization,
      removeCustomization,
      clear,
      totalItems,
      totalCost,
    ],
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
