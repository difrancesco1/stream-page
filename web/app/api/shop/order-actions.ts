"use server";

import { API_URL } from "@/lib/api";

export type OrderStatus =
    | "pending"
    | "paid"
    | "shipped"
    | "delivered"
    | "failed"
    | "refunded";

export type OrderItem = {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
};

export type OrderSummary = {
    id: string;
    status: OrderStatus;
    customer_first_name: string;
    customer_last_name: string;
    customer_email: string;
    total_amount: number;
    item_count: number;
    tracking_number: string | null;
    created_at: string;
};

export type OrderDetail = {
    id: string;
    status: OrderStatus;
    customer_first_name: string;
    customer_last_name: string;
    customer_email: string;
    customer_phone: string;
    shipping_street: string;
    shipping_city: string;
    shipping_state: string;
    shipping_zip: string;
    shipping_country: string;
    total_amount: number;
    items: OrderItem[];
    tracking_number: string | null;
    tracking_carrier: string | null;
    tracking_url: string | null;
    shipped_at: string | null;
    created_at: string;
    updated_at: string;
};

export type OrderUpdatePatch = {
    status?: OrderStatus;
    tracking_number?: string | null;
    tracking_carrier?: string | null;
    tracking_url?: string | null;
    shipped_at?: string | null;
};

export type ListOrdersResult =
    | { success: true; orders: OrderSummary[] }
    | { success: false; orders: []; error: string };

export type GetOrderResult =
    | { success: true; order: OrderDetail }
    | { success: false; error: string };

export type UpdateOrderResult =
    | { success: true; order: OrderDetail }
    | { success: false; error: string };

async function parseError(response: Response, fallback: string): Promise<string> {
    try {
        const data = await response.json();
        return data.detail || data.message || fallback;
    } catch {
        return fallback;
    }
}

export async function listOrders(
    token: string,
    opts?: { status?: OrderStatus },
): Promise<ListOrdersResult> {
    try {
        const params = new URLSearchParams();
        if (opts?.status) params.set("status", opts.status);
        const qs = params.toString();
        const url = `${API_URL}/shop/orders${qs ? `?${qs}` : ""}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        if (!response.ok) {
            const error = await parseError(response, `Server error: ${response.status}`);
            return { success: false, orders: [], error };
        }

        const orders = (await response.json()) as OrderSummary[];
        return { success: true, orders };
    } catch (error) {
        return {
            success: false,
            orders: [],
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function getOrder(orderId: string): Promise<GetOrderResult> {
    try {
        const response = await fetch(
            `${API_URL}/shop/orders/${encodeURIComponent(orderId)}`,
            {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            },
        );

        if (!response.ok) {
            const error = await parseError(response, `Server error: ${response.status}`);
            return { success: false, error };
        }

        const order = (await response.json()) as OrderDetail;
        return { success: true, order };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function updateOrder(
    token: string,
    orderId: string,
    patch: OrderUpdatePatch,
): Promise<UpdateOrderResult> {
    try {
        const response = await fetch(
            `${API_URL}/shop/orders/${encodeURIComponent(orderId)}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(patch),
            },
        );

        if (!response.ok) {
            const error = await parseError(response, `Server error: ${response.status}`);
            return { success: false, error };
        }

        const order = (await response.json()) as OrderDetail;
        return { success: true, order };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}
