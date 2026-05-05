"use server";

import { API_URL } from "@/lib/api";

export type ProductCategory = "tokens" | "stickers" | "etc";

export type ProductMediaType = "image" | "video";

export type ProductMedia = {
    id: string;
    url: string;
    media_type: ProductMediaType;
    display_order: number;
    is_featured: boolean;
    created_at: string;
};

export type Product = {
    id: string;
    category: ProductCategory;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    quantity: number;
    media: ProductMedia[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type ShopResult = {
    success: boolean;
    message: string;
    error?: string;
};

export type CreateOrUpdateProductResult =
    | { success: true; product: Product }
    | { success: false; error: string };

export type ListProductsResult =
    | { success: true; products: Product[] }
    | { success: false; products: []; error: string };

export type ProductMediaResult =
    | { success: true; media: ProductMedia }
    | { success: false; error: string };

export type ReorderMediaResult =
    | { success: true; media: ProductMedia[] }
    | { success: false; error: string };

async function parseError(response: Response, fallback: string): Promise<string> {
    try {
        const data = await response.json();
        return data.detail || data.message || fallback;
    } catch {
        return fallback;
    }
}

export async function listProducts(opts?: {
    activeOnly?: boolean;
    category?: ProductCategory;
}): Promise<ListProductsResult> {
    try {
        const params = new URLSearchParams();
        if (opts?.activeOnly !== undefined) {
            params.set("active_only", String(opts.activeOnly));
        }
        if (opts?.category) {
            params.set("category", opts.category);
        }
        const qs = params.toString();
        const url = `${API_URL}/shop/products${qs ? `?${qs}` : ""}`;

        const response = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
        });

        if (!response.ok) {
            const error = await parseError(response, `Server error: ${response.status}`);
            return { success: false, products: [], error };
        }

        const data = (await response.json()) as Product[];
        return { success: true, products: data };
    } catch (error) {
        return {
            success: false,
            products: [],
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function createProduct(
    token: string,
    formData: FormData
): Promise<CreateOrUpdateProductResult> {
    try {
        const response = await fetch(`${API_URL}/shop/products`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        if (!response.ok) {
            const error = await parseError(response, `Server error: ${response.status}`);
            return { success: false, error };
        }

        const product = (await response.json()) as Product;
        return { success: true, product };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function updateProduct(
    token: string,
    productId: string,
    formData: FormData
): Promise<CreateOrUpdateProductResult> {
    try {
        const response = await fetch(`${API_URL}/shop/products/${productId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        if (!response.ok) {
            const error = await parseError(response, `Server error: ${response.status}`);
            return { success: false, error };
        }

        const product = (await response.json()) as Product;
        return { success: true, product };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function deleteProduct(
    token: string,
    productId: string
): Promise<ShopResult> {
    try {
        const response = await fetch(`${API_URL}/shop/products/${productId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to delete product",
            };
        }

        return {
            success: true,
            message: data.message || "Product deleted",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function deactivateProduct(
    token: string,
    productId: string
): Promise<ShopResult> {
    try {
        const formData = new FormData();
        formData.append("is_active", "false");

        const response = await fetch(`${API_URL}/shop/products/${productId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        if (!response.ok) {
            const error = await parseError(response, `Server error: ${response.status}`);
            return { success: false, message: "", error };
        }

        return {
            success: true,
            message: "Product deactivated",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function uploadProductMedia(
    token: string,
    productId: string,
    formData: FormData
): Promise<ProductMediaResult> {
    try {
        const response = await fetch(`${API_URL}/shop/products/${productId}/media`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        if (!response.ok) {
            const error = await parseError(response, `Server error: ${response.status}`);
            return { success: false, error };
        }

        const media = (await response.json()) as ProductMedia;
        return { success: true, media };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function updateProductMedia(
    token: string,
    productId: string,
    mediaId: string,
    patch: { is_featured?: boolean; display_order?: number }
): Promise<ProductMediaResult> {
    try {
        const response = await fetch(
            `${API_URL}/shop/products/${productId}/media/${mediaId}`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(patch),
            }
        );

        if (!response.ok) {
            const error = await parseError(response, `Server error: ${response.status}`);
            return { success: false, error };
        }

        const media = (await response.json()) as ProductMedia;
        return { success: true, media };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function deleteProductMedia(
    token: string,
    productId: string,
    mediaId: string
): Promise<ShopResult> {
    try {
        const response = await fetch(
            `${API_URL}/shop/products/${productId}/media/${mediaId}`,
            {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to delete media",
            };
        }

        return {
            success: true,
            message: data.message || "Media deleted",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function reorderProductMedia(
    token: string,
    productId: string,
    order: { id: string; display_order: number }[]
): Promise<ReorderMediaResult> {
    try {
        const response = await fetch(
            `${API_URL}/shop/products/${productId}/media/order`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ order }),
            }
        );

        if (!response.ok) {
            const error = await parseError(response, `Server error: ${response.status}`);
            return { success: false, error };
        }

        const media = (await response.json()) as ProductMedia[];
        return { success: true, media };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}
