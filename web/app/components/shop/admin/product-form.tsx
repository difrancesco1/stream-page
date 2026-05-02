"use client";

import { useMemo, useRef, useState } from "react";

import { useAuth } from "@/app/context/auth-context";
import {
  createProduct,
  updateProduct,
  uploadProductMedia,
  type Product,
  type ProductCategory,
  type ProductMedia,
} from "@/app/api/shop/actions";

import ProductMediaManager from "./product-media-manager";

const CATEGORIES: ProductCategory[] = ["tokens", "stickers", "etc"];

const NEW_MEDIA_ACCEPT =
  "image/png,image/jpeg,image/webp,video/mp4,video/webm";

interface ProductFormProps {
  mode: "create" | "edit";
  product?: Product;
  onSuccess: (product: Product) => void;
  onCancel?: () => void;
}

type PendingFile = {
  key: string;
  file: File;
};

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

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [featuredKey, setFeaturedKey] = useState<string | null>(null);

  const [media, setMedia] = useState<ProductMedia[]>(product?.media ?? []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrls = useMemo(
    () =>
      pendingFiles.map((p) => ({ key: p.key, url: URL.createObjectURL(p.file), file: p.file })),
    [pendingFiles],
  );

  const resetForm = () => {
    setName("");
    setCategory("tokens");
    setPrice("");
    setQuantity("0");
    setDescription("");
    setIsActive(true);
    setPendingFiles([]);
    setFeaturedKey(null);
    setMedia([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddPendingFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const additions: PendingFile[] = Array.from(files).map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
    }));
    setPendingFiles((prev) => {
      const next = [...prev, ...additions];
      if (!featuredKey && next.length > 0) {
        setFeaturedKey(next[0].key);
      }
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePending = (key: string) => {
    setPendingFiles((prev) => {
      const next = prev.filter((p) => p.key !== key);
      if (featuredKey === key) {
        setFeaturedKey(next[0]?.key ?? null);
      }
      return next;
    });
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

    if (mode === "create") {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("category", category);
      fd.append("price", String(priceNum));
      fd.append("quantity", String(quantityNum));
      if (description.trim()) fd.append("description", description.trim());

      const result = await createProduct(token, fd);

      if (!result.success) {
        setIsSubmitting(false);
        setError(result.error);
        return;
      }

      let createdProduct = result.product;
      const featuredCandidate =
        featuredKey ?? (pendingFiles.length > 0 ? pendingFiles[0].key : null);

      for (const pending of pendingFiles) {
        const mediaForm = new FormData();
        mediaForm.append("file", pending.file);
        if (pending.key === featuredCandidate) {
          mediaForm.append("is_featured", "true");
        }
        const uploadResult = await uploadProductMedia(
          token,
          createdProduct.id,
          mediaForm,
        );
        if (!uploadResult.success) {
          setIsSubmitting(false);
          setError(
            `Product saved, but a media upload failed: ${uploadResult.error}`,
          );
          onSuccess(createdProduct);
          return;
        }
        createdProduct = {
          ...createdProduct,
          media: [...createdProduct.media, uploadResult.media],
        };
      }

      setIsSubmitting(false);
      resetForm();
      onSuccess(createdProduct);
      return;
    }

    if (!product) {
      setIsSubmitting(false);
      return;
    }

    const fd = new FormData();
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

    const result = await updateProduct(token, product.id, fd);
    setIsSubmitting(false);

    if (result.success) {
      onSuccess({ ...result.product, media });
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

      {mode === "edit" && product && (
        <div className="flex flex-col gap-[var(--spacing-xs)]">
          <ProductMediaManager
            productId={product.id}
            media={media}
            onChange={setMedia}
          />
        </div>
      )}

      {mode === "create" && (
        <div className="flex flex-col gap-[0.25rem]">
          <span className="main-text text-[0.75rem] text-[color:var(--border)]">
            media (images and/or videos; pick one to feature)
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept={NEW_MEDIA_ACCEPT}
            multiple
            onChange={(e) => handleAddPendingFiles(e.target.files)}
            disabled={isSubmitting}
            className="main-text text-[0.75rem] text-[color:var(--border)]"
          />

          {previewUrls.length > 0 && (
            <ul className="flex flex-col gap-[0.25rem] mt-[0.25rem]">
              {previewUrls.map((p) => {
                const isVideo = p.file.type.startsWith("video/");
                return (
                  <li
                    key={p.key}
                    className="pixel-borders bg-background p-[var(--spacing-xs)]
                      flex items-center gap-[var(--spacing-sm)]"
                  >
                    <div className="relative w-[3rem] h-[3rem] bg-white pixel-borders shrink-0 overflow-hidden">
                      {isVideo ? (
                        <video
                          src={p.url}
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        // Local blob URLs aren't on the next/image allowlist;
                        // a plain <img> is fine for a preview tile.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.url}
                          alt=""
                          className="w-full h-full object-contain p-1"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 main-text text-[0.6875rem] text-[color:var(--border)] truncate">
                      {p.file.name}
                    </div>
                    <label className="main-text text-[0.6875rem] text-[color:var(--border)] flex items-center gap-[0.25rem]">
                      <input
                        type="radio"
                        name="featured-pending"
                        checked={featuredKey === p.key}
                        onChange={() => setFeaturedKey(p.key)}
                        disabled={isSubmitting}
                      />
                      featured
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemovePending(p.key)}
                      disabled={isSubmitting}
                      className="pixel-borders pixel-btn-border px-2 py-1 text-[0.6875rem] cursor-pointer
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

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
