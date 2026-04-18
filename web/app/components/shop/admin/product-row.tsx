"use client";

import Image from "next/image";
import { useState } from "react";

import { useAuth } from "@/app/context/auth-context";
import { deleteProduct, type Product } from "@/app/api/shop/actions";

import ProductForm from "./product-form";

interface ProductRowProps {
  product: Product;
  onChanged: () => void;
}

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default function ProductRow({ product, onChanged }: ProductRowProps) {
  const { token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!token) return;
    if (!confirm(`Deactivate "${product.name}"? It will be hidden from the public shop.`)) {
      return;
    }

    setError(null);
    setIsDeleting(true);
    const result = await deleteProduct(token, product.id);
    setIsDeleting(false);

    if (result.success) {
      onChanged();
    } else {
      setError(result.error || "Failed to delete product");
    }
  };

  if (isEditing) {
    return (
      <ProductForm
        mode="edit"
        product={product}
        onSuccess={() => {
          setIsEditing(false);
          onChanged();
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="pixel-borders bg-foreground p-[var(--spacing-sm)] flex items-center gap-[var(--spacing-sm)]">
      <div className="relative w-[3rem] h-[3rem] md:w-[3.5rem] md:h-[3.5rem] bg-white pixel-borders shrink-0">
        {product.image_url && (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-contain p-1"
          />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-[0.125rem]">
        <div className="flex items-center gap-[var(--spacing-xs)] flex-wrap">
          <span className="main-text text-[0.875rem] truncate">
            {product.name}
          </span>
          {!product.is_active && (
            <span className="pixel-borders px-[0.325rem] main-text text-[0.625rem] bg-background text-[color:var(--border)] opacity-70">
              inactive
            </span>
          )}
        </div>
        <div className="main-text text-[0.75rem] text-[color:var(--border)] opacity-80">
          {priceFormatter.format(product.price)} &middot; qty {product.quantity}
        </div>
        {product.description && (
          <div className="main-text text-[0.6875rem] text-[color:var(--border)] opacity-70 line-clamp-1">
            {product.description}
          </div>
        )}
        {error && (
          <div className="main-text text-[0.6875rem] text-red-400">
            {error}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-[0.25rem] shrink-0">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          disabled={isDeleting}
          className="pixel-borders pixel-btn-border px-2 py-1 text-[0.75rem] cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting || !product.is_active}
          className="pixel-borders pixel-btn-border px-2 py-1 text-[0.75rem] cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed"
          title={product.is_active ? "Deactivate product" : "Already inactive"}
        >
          {isDeleting ? "..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
