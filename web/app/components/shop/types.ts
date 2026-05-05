export type ProductMediaType = "image" | "video";

export type ProductMedia = {
  id: string;
  url: string;
  media_type: ProductMediaType;
  display_order: number;
  is_featured: boolean;
  created_at: string;
};

export type ShopItem = {
  id: string;
  category: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  quantity: number;
  media: ProductMedia[];
  is_active: boolean;
};

/**
 * Returns the media item that should represent a product visually.
 * Prefers an `is_featured=true` row, then falls back to the first by
 * `display_order`, then `null` when the product has no media.
 */
export function featuredMedia(
  item: { media: ProductMedia[] } | null | undefined
): ProductMedia | null {
  if (!item?.media?.length) return null;
  const featured = item.media.find((m) => m.is_featured);
  if (featured) return featured;
  const sorted = [...item.media].sort((a, b) => {
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return a.created_at.localeCompare(b.created_at);
  });
  return sorted[0] ?? null;
}

export function sortedMedia(media: ProductMedia[]): ProductMedia[] {
  return [...media].sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return a.created_at.localeCompare(b.created_at);
  });
}
