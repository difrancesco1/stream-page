"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

import { useAuth } from "@/app/context/auth-context";
import {
  deleteProductMedia,
  reorderProductMedia,
  updateProductMedia,
  uploadProductMedia,
  type ProductMedia,
} from "@/app/api/shop/actions";
import { sortedMedia } from "@/app/components/shop/types";

const ACCEPT =
  "image/png,image/jpeg,image/webp,video/mp4,video/webm";

interface ProductMediaManagerProps {
  productId: string;
  media: ProductMedia[];
  onChange: (media: ProductMedia[]) => void;
}

export default function ProductMediaManager({
  productId,
  media,
  onChange,
}: ProductMediaManagerProps) {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ordered = useMemo(() => sortedMedia(media), [media]);

  const handleUpload = async (files: FileList | null) => {
    if (!token || !files || files.length === 0) return;
    setError(null);
    setBusy(true);

    let working = [...media];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadProductMedia(token, productId, fd);
      if (!result.success) {
        setError(result.error);
        break;
      }
      working = [...working, result.media];
      onChange(working);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setBusy(false);
  };

  const handleSetFeatured = async (mediaId: string, isFeatured: boolean) => {
    if (!token) return;
    setError(null);
    setBusy(true);
    const result = await updateProductMedia(token, productId, mediaId, {
      is_featured: isFeatured,
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    const next = media.map((m) =>
      m.id === mediaId
        ? result.media
        : isFeatured && m.is_featured
        ? { ...m, is_featured: false }
        : m,
    );
    onChange(next);
  };

  const handleDelete = async (mediaId: string) => {
    if (!token) return;
    if (!confirm("Remove this media item? This cannot be undone.")) return;
    setError(null);
    setBusy(true);
    const result = await deleteProductMedia(token, productId, mediaId);
    setBusy(false);
    if (!result.success) {
      setError(result.error || "Failed to delete media");
      return;
    }
    onChange(media.filter((m) => m.id !== mediaId));
  };

  const handleMove = async (mediaId: string, direction: -1 | 1) => {
    if (!token) return;
    const list = sortedMedia(media);
    const idx = list.findIndex((m) => m.id === mediaId);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= list.length) return;

    const reordered = [...list];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(newIdx, 0, moved);

    const order = reordered.map((m, i) => ({ id: m.id, display_order: i }));

    setError(null);
    setBusy(true);
    const result = await reorderProductMedia(token, productId, order);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onChange(result.media);
  };

  return (
    <div className="flex flex-col gap-[var(--spacing-sm)]">
      <div className="flex items-center justify-between gap-[var(--spacing-sm)]">
        <span className="main-text text-[0.75rem] text-[color:var(--border)]">
          media ({ordered.length})
        </span>
        <label className="main-text text-[0.75rem] text-[color:var(--border)]">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            disabled={busy}
            onChange={(e) => handleUpload(e.target.files)}
            className="text-[0.75rem]"
          />
        </label>
      </div>

      {ordered.length === 0 ? (
        <div className="pixel-borders bg-background p-[var(--spacing-sm)]">
          <span className="main-text text-[0.75rem] text-[color:var(--border)] opacity-70">
            No media yet. Add images or videos above.
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-[0.25rem]">
          {ordered.map((m, i) => (
            <li
              key={m.id}
              className="pixel-borders bg-background p-[var(--spacing-xs)]
                flex items-center gap-[var(--spacing-sm)]"
            >
              <div className="relative w-[3rem] h-[3rem] bg-white pixel-borders shrink-0 overflow-hidden">
                {m.media_type === "image" ? (
                  <Image
                    src={m.url}
                    alt=""
                    fill
                    className="object-contain p-1"
                  />
                ) : (
                  <video
                    src={m.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0 main-text text-[0.6875rem] text-[color:var(--border)]">
                <div className="uppercase tracking-wide opacity-70">
                  {m.media_type}
                </div>
                <div className="truncate opacity-60">{m.url}</div>
              </div>

              <label className="main-text text-[0.6875rem] text-[color:var(--border)] flex items-center gap-[0.25rem]">
                <input
                  type="checkbox"
                  checked={m.is_featured}
                  disabled={busy}
                  onChange={(e) => handleSetFeatured(m.id, e.target.checked)}
                />
                featured
              </label>

              <div className="flex flex-col gap-[0.125rem]">
                <button
                  type="button"
                  onClick={() => handleMove(m.id, -1)}
                  disabled={busy || i === 0}
                  className="pixel-borders pixel-btn-border-sm px-1.5 py-0 text-[0.625rem]
                    disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Move up"
                  title="Move up"
                >
                  up
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(m.id, 1)}
                  disabled={busy || i === ordered.length - 1}
                  className="pixel-borders pixel-btn-border-sm px-1.5 py-0 text-[0.625rem]
                    disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Move down"
                  title="Move down"
                >
                  dn
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                disabled={busy}
                className="pixel-borders pixel-btn-border px-2 py-1 text-[0.6875rem] cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="pixel-borders bg-background p-[var(--spacing-sm)]">
          <span className="main-text text-[0.6875rem] text-red-400">{error}</span>
        </div>
      )}
    </div>
  );
}
