"use server";

import { API_URL } from "@/lib/api";

export type ProductCategory = "tokens" | "stickers" | "etc";

export type Product = {
    id: string;
    category: ProductCategory;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    quantity: number;
    image_url: string | null;
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
            let errorMessage = `Server error: ${response.status}`;
            try {
                const data = await response.json();
                errorMessage = data.detail || data.message || errorMessage;
            } catch {
                /* ignore */
            }
            return { success: false, products: [], error: errorMessage };
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
            let errorMessage = `Server error: ${response.status}`;
            try {
                const data = await response.json();
                errorMessage = data.detail || data.message || errorMessage;
            } catch {
                /* ignore */
            }
            return { success: false, error: errorMessage };
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
            let errorMessage = `Server error: ${response.status}`;
            try {
                const data = await response.json();
                errorMessage = data.detail || data.message || errorMessage;
            } catch {
                /* ignore */
            }
            return { success: false, error: errorMessage };
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
            message: data.message || "Product deactivated",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}
