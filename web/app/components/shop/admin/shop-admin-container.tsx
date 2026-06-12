"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/context/auth-context";
import {
  listProducts,
  reorderProducts,
  type Product,
  type ProductCategory,
} from "@/app/api/shop/actions";

import AdminTabs from "./admin-tabs";
import ProductForm from "./product-form";
import ProductRow from "./product-row";

const CATEGORY_ORDER: ProductCategory[] = [
  "tokens",
  "custom",
  "stickers",
  "etc",
  "preorder",
];

export default function ShopAdminContainer() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await listProducts({ activeOnly: false });
    if (result.success) {
      setProducts(result.products);
    } else {
      setError(result.error);
      setProducts([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Sort by admin-controlled display_order so the admin sees the exact same
  // order customers see in the public shop.
  const sortedProducts = useMemo(
    () =>
      [...products].sort((a, b) => {
        if (a.display_order !== b.display_order) {
          return a.display_order - b.display_order;
        }
        return a.id.localeCompare(b.id);
      }),
    [products],
  );

  const grouped: Record<ProductCategory, Product[]> = {
    tokens: [],
    stickers: [],
    etc: [],
    custom: [],
    preorder: [],
  };
  for (const p of sortedProducts) {
    if (grouped[p.category]) grouped[p.category].push(p);
  }

  // Move a product up or down within its category by swapping
  // display_order with the neighbor in the same category. Optimistically
  // updates local state, then persists. Reverts on failure.
  const handleMove = useCallback(
    async (productId: string, direction: "up" | "down") => {
      if (!token) return;
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      const peers = grouped[product.category];
      const index = peers.findIndex((p) => p.id === productId);
      if (index === -1) return;
      const neighborIndex = direction === "up" ? index - 1 : index + 1;
      if (neighborIndex < 0 || neighborIndex >= peers.length) return;

      const neighbor = peers[neighborIndex];
      const productOrder = product.display_order;
      const neighborOrder = neighbor.display_order;
      // When two rows share the same display_order (e.g. a fresh table or a
      // tie), bump one by 1 to guarantee they actually swap visually.
      const [newProductOrder, newNeighborOrder] =
        productOrder === neighborOrder
          ? direction === "up"
            ? [productOrder - 1, neighborOrder]
            : [productOrder + 1, neighborOrder]
          : [neighborOrder, productOrder];

      const previous = products;
      setReorderingId(productId);
      setReorderError(null);
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === product.id) return { ...p, display_order: newProductOrder };
          if (p.id === neighbor.id) return { ...p, display_order: newNeighborOrder };
          return p;
        }),
      );

      const result = await reorderProducts(token, [
        { id: product.id, display_order: newProductOrder },
        { id: neighbor.id, display_order: newNeighborOrder },
      ]);

      if (!result.success) {
        setReorderError(result.error || "Failed to reorder products");
        setProducts(previous);
      } else {
        setProducts(result.products);
      }
      setReorderingId(null);
    },
    [grouped, products, token],
  );

  return (
    <div className="w-full max-w-[50rem] mx-auto flex flex-col gap-[var(--spacing-md)]">
      <div className="flex items-center justify-between gap-[var(--spacing-sm)]">
        <span className="main-text text-[1.125rem] md:text-[1.25rem]">
          manage shop
        </span>
        <Link
          href="/shop"
          className="pixel-borders px-[var(--spacing-sm)] py-[0.25rem]
            bg-foreground text-[color:var(--border)] main-text text-[0.75rem]
            hover:bg-[color:var(--accent)] hover:text-[color:var(--background)]
            transition-colors"
        >
          back to shop
        </Link>
      </div>

      <AdminTabs active="products" />

      <ProductForm mode="create" onSuccess={() => fetchProducts()} />

      {reorderError && (
        <div className="pixel-borders bg-foreground p-[var(--spacing-sm)]">
          <span className="main-text text-[0.75rem] text-red-400">
            {reorderError}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-[var(--spacing-md)]">
        {isLoading ? (
          <div className="main-text text-[0.875rem] text-[color:var(--border)] opacity-70">
            Loading...
          </div>
        ) : error ? (
          <div className="pixel-borders bg-foreground p-[var(--spacing-sm)]">
            <span className="main-text text-[0.75rem] text-red-400">
              {error}
            </span>
          </div>
        ) : products.length === 0 ? (
          <div className="pixel-borders bg-foreground p-[var(--spacing-md)]">
            <span className="main-text text-[0.875rem] text-[color:var(--border)] opacity-70">
              No products yet. Add one above.
            </span>
          </div>
        ) : (
          CATEGORY_ORDER.map((category) => {
            const items = grouped[category];
            if (items.length === 0) return null;
            return (
              <section
                key={category}
                className="flex flex-col gap-[var(--spacing-sm)]"
              >
                <div className="main-text text-[0.875rem] text-[color:var(--border)]">
                  {category} ({items.length})
                </div>
                <div className="flex flex-col gap-[var(--spacing-sm)]">
                  {items.map((p, index) => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      onChanged={fetchProducts}
                      onMoveUp={() => handleMove(p.id, "up")}
                      onMoveDown={() => handleMove(p.id, "down")}
                      canMoveUp={index > 0}
                      canMoveDown={index < items.length - 1}
                      isReordering={reorderingId === p.id}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
