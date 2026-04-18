"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  listProducts,
  type Product,
  type ProductCategory,
} from "@/app/api/shop/actions";

import ProductForm from "./product-form";
import ProductRow from "./product-row";

const CATEGORY_ORDER: ProductCategory[] = ["tokens", "stickers", "etc"];

export default function ShopAdminContainer() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const grouped: Record<ProductCategory, Product[]> = {
    tokens: [],
    stickers: [],
    etc: [],
  };
  for (const p of products) {
    if (grouped[p.category]) grouped[p.category].push(p);
  }

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

      <ProductForm mode="create" onSuccess={() => fetchProducts()} />

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
                  {items.map((p) => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      onChanged={fetchProducts}
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
