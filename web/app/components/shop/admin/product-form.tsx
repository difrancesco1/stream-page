"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { useAuth } from "@/app/context/auth-context";
import {
  createProduct,
  updateProduct,
  type Product,
  type ProductCategory,
} from "@/app/api/shop/actions";

const CATEGORIES: ProductCategory[] = ["tokens", "stickers", "etc"];

interface ProductFormProps {
  mode: "create" | "edit";
  product?: Product;
  onSuccess: (product: Product) => void;
  onCancel?: () => void;
}

export default function ProductForm({
  mode,
  product,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState<ProductCategory>(
    product?.category ?? "tokens",
  );
  const [price, setPrice] = useState<string>(
    product ? String(product.price) : "",
  );
  const [quantity, setQuantity] = useState<string>(
    product ? String(product.quantity) : "0",
  );
  const [description, setDescription] = useState(product?.description ?? "");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setCategory("tokens");
    setPrice("");
    setQuantity("0");
    setDescription("");
    setIsActive(true);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!token) return;

    const priceNum = Number(price);
    const quantityNum = Number(quantity);

    if (mode === "create") {
      if (!name.trim()) {
        setError("Name is required");
        return;
      }
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        setError("Price must be a non-negative number");
        return;
      }
      if (!Number.isFinite(quantityNum) || quantityNum < 0) {
        setError("Quantity must be a non-negative integer");
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);

    const fd = new FormData();

    if (mode === "create") {
      fd.append("name", name.trim());
      fd.append("category", category);
      fd.append("price", String(priceNum));
      fd.append("quantity", String(quantityNum));
      if (description.trim()) fd.append("description", description.trim());
      if (file) fd.append("file", file);

      const result = await createProduct(token, fd);
      setIsSubmitting(false);

      if (result.success) {
        resetForm();
        onSuccess(result.product);
      } else {
        setError(result.error);
      }
      return;
    }

    if (!product) return;

    if (name.trim() !== product.name) fd.append("name", name.trim());
    if (category !== product.category) fd.append("category", category);
    if (priceNum !== product.price) fd.append("price", String(priceNum));
    if (quantityNum !== product.quantity) {
      fd.append("quantity", String(quantityNum));
    }
    const nextDesc = description.trim();
    if (nextDesc !== (product.description ?? "")) {
      fd.append("description", nextDesc);
    }
    if (isActive !== product.is_active) {
      fd.append("is_active", String(isActive));
    }
    if (file) fd.append("file", file);

    const result = await updateProduct(token, product.id, fd);
    setIsSubmitting(false);

    if (result.success) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSuccess(result.product);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="pixel-borders bg-foreground p-[var(--spacing-md)] flex flex-col gap-[var(--spacing-sm)]">
      <div className="main-text text-[0.875rem] md:text-[1rem]">
        {mode === "create" ? "add product" : `edit: ${product?.name}`}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-sm)]">
        <label className="flex flex-col gap-[0.25rem]">
          <span className="main-text text-[0.75rem] text-[color:var(--border)]">
            name
          </span>
          <input
            type="text"
            className="pixel-borders pixel-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            placeholder="product name"
          />
        </label>

        <label className="flex flex-col gap-[0.25rem]">
          <span className="main-text text-[0.75rem] text-[color:var(--border)]">
            category
          </span>
          <select
            className="pixel-borders pixel-input"
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory)}
            disabled={isSubmitting}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-[0.25rem]">
          <span className="main-text text-[0.75rem] text-[color:var(--border)]">
            price (USD)
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="pixel-borders pixel-input"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={isSubmitting}
            placeholder="0.00"
          />
        </label>

        <label className="flex flex-col gap-[0.25rem]">
          <span className="main-text text-[0.75rem] text-[color:var(--border)]">
            quantity
          </span>
          <input
            type="number"
            min="0"
            step="1"
            className="pixel-borders pixel-input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={isSubmitting}
          />
        </label>
      </div>

      <label className="flex flex-col gap-[0.25rem]">
        <span className="main-text text-[0.75rem] text-[color:var(--border)]">
          description (optional)
        </span>
        <textarea
          className="pixel-borders pixel-input resize-none"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          rows={2}
          placeholder="short description"
        />
      </label>

      <div className="flex flex-col gap-[0.25rem]">
        <span className="main-text text-[0.75rem] text-[color:var(--border)]">
          image {mode === "edit" ? "(leave empty to keep current)" : "(optional)"}
        </span>
        <div className="flex items-center gap-[var(--spacing-sm)]">
          {mode === "edit" && product?.image_url && !file && (
            <div className="relative w-[3rem] h-[3rem] bg-white pixel-borders shrink-0">
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-contain p-1"
              />
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={isSubmitting}
            className="main-text text-[0.75rem] text-[color:var(--border)]"
          />
        </div>
      </div>

      {mode === "edit" && (
        <label className="flex items-center gap-[var(--spacing-xs)]">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={isSubmitting}
          />
          <span className="main-text text-[0.75rem] text-[color:var(--border)]">
            active (unchecking hides it from the public shop)
          </span>
        </label>
      )}

      {error && (
        <div className="pixel-borders bg-background p-[var(--spacing-sm)]">
          <span className="main-text text-[0.75rem] text-red-400">{error}</span>
        </div>
      )}

      <div className="flex gap-[var(--spacing-sm)] justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="pixel-borders pixel-btn-border px-3 py-1.5 text-[0.875rem]"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !token}
          className="pixel-borders pixel-btn-border px-3 py-1.5 text-[0.875rem]
            disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
              ? "Add product"
              : "Save"}
        </button>
      </div>
    </div>
  );
}
