"use server";

import { API_URL } from "@/lib/api";

export type OrderStatus =
    | "pending"
    | "paid"
    | "shipped"
    | "delivered"
    | "failed"
    | "refunded"
    | "in_person";

export type OrderCustomization = {
    id: string;
    product_id: string;
    card_name: string;
    description: string;
    is_complete: boolean;
    image_url: string | null;
};

export type QueueRowKind = "custom" | "item";

export type CustomizationQueueRow = {
    id: string;
    kind: QueueRowKind;
    quantity: number;
    order_id: string;
    order_id_short: string;
    order_status: OrderStatus;
    order_created_at: string;
    card_name: string;
    description: string;
    is_complete: boolean;
    image_url: string | null;
    customer_first_name: string;
    customer_last_name: string;
    customer_email: string;
    customer_discord_handle: string;
    shipping_street: string;
    shipping_city: string;
    shipping_state: string;
    shipping_zip: string;
    shipping_country: string;
    product_name: string;
    order_total_quantity: number;
};

export type ListCustomizationsResult =
    | { success: true; rows: CustomizationQueueRow[] }
    | { success: false; rows: []; error: string };

export type UpdateCustomizationResult =
    | { success: true; row: CustomizationQueueRow }
    | { success: false; error: string };

export type WaitlistEntry = {
    id: string;
    card_name: string;
    image_url: string | null;
    is_complete: boolean;
    customer_discord_handle: string;
    order_created_at: string;
    created_at: string;
};

export type OrderItem = {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    customizations: OrderCustomization[];
};

export type OrderSummary = {
    id: string;
    status: OrderStatus;
    customer_first_name: string;
    customer_last_name: string;
    customer_email: string;
    customer_discord_handle: string;
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
    customer_discord_handle: string;
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
    notes: string | null;
    shipped_at: string | null;
    created_at: string;
    updated_at: string;
};

export type OrderUpdatePatch = {
    status?: OrderStatus;
    tracking_number?: string | null;
    tracking_carrier?: string | null;
    tracking_url?: string | null;
    notes?: string | null;
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

export async function listCustomizations(
    token: string,
    opts?: { status?: OrderStatus },
): Promise<ListCustomizationsResult> {
    try {
        const params = new URLSearchParams();
        if (opts?.status) params.set("status", opts.status);
        const qs = params.toString();
        const url = `${API_URL}/shop/customizations${qs ? `?${qs}` : ""}`;

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
            return { success: false, rows: [], error };
        }

        const rows = (await response.json()) as CustomizationQueueRow[];
        return { success: true, rows };
    } catch (error) {
        return {
            success: false,
            rows: [],
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function updateCustomization(
    token: string,
    customizationId: string,
    patch: { is_complete: boolean },
): Promise<UpdateCustomizationResult> {
    try {
        const response = await fetch(
            `${API_URL}/shop/customizations/${encodeURIComponent(customizationId)}`,
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

        const row = (await response.json()) as CustomizationQueueRow;
        return { success: true, row };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function updateOrderItem(
    token: string,
    orderItemId: string,
    patch: { is_complete: boolean },
): Promise<UpdateCustomizationResult> {
    try {
        const response = await fetch(
            `${API_URL}/shop/order-items/${encodeURIComponent(orderItemId)}`,
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

        const row = (await response.json()) as CustomizationQueueRow;
        return { success: true, row };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function uploadCustomizationImage(
    token: string,
    customizationId: string,
    formData: FormData,
): Promise<UpdateCustomizationResult> {
    try {
        const response = await fetch(
            `${API_URL}/shop/customizations/${encodeURIComponent(customizationId)}/image`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            },
        );

        if (!response.ok) {
            const error = await parseError(response, `Server error: ${response.status}`);
            return { success: false, error };
        }

        const row = (await response.json()) as CustomizationQueueRow;
        return { success: true, row };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function deleteCustomizationImage(
    token: string,
    customizationId: string,
): Promise<UpdateCustomizationResult> {
    try {
        const response = await fetch(
            `${API_URL}/shop/customizations/${encodeURIComponent(customizationId)}/image`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        if (!response.ok) {
            const error = await parseError(response, `Server error: ${response.status}`);
            return { success: false, error };
        }

        const row = (await response.json()) as CustomizationQueueRow;
        return { success: true, row };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function listWaitlist(): Promise<WaitlistEntry[]> {
    try {
        const response = await fetch(`${API_URL}/shop/waitlist`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
        });
        if (!response.ok) return [];
        return (await response.json()) as WaitlistEntry[];
    } catch {
        return [];
    }
}
