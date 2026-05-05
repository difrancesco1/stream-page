"use server";

import { API_URL } from "@/lib/api";

export type CartLineItem = {
    product_id: string;
    quantity: number;
};

export type CheckoutCustomerInfo = {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    shipping_street: string;
    shipping_city: string;
    shipping_state: string;
    shipping_zip: string;
    shipping_country: string;
};

export type CreateOrderResult =
    | { success: true; order_id: string; paypal_order_id: string }
    | { success: false; error: string };

export type CaptureOrderResult =
    | { success: true; order_id: string; status: string; message: string }
    | { success: false; error: string };

async function parseError(response: Response, fallback: string): Promise<string> {
    try {
        const data = await response.json();
        return data.detail || data.message || fallback;
    } catch {
        return fallback;
    }
}

export async function createCheckoutOrder(
    items: CartLineItem[],
    customer: CheckoutCustomerInfo,
): Promise<CreateOrderResult> {
    try {
        const response = await fetch(`${API_URL}/shop/orders/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items, customer }),
            cache: "no-store",
        });

        if (!response.ok) {
            const error = await parseError(response, `Server error: ${response.status}`);
            return { success: false, error };
        }

        const data = (await response.json()) as {
            order_id: string;
            paypal_order_id: string;
        };
        return { success: true, order_id: data.order_id, paypal_order_id: data.paypal_order_id };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function captureCheckoutOrder(
    paypalOrderId: string,
): Promise<CaptureOrderResult> {
    try {
        const response = await fetch(
            `${API_URL}/shop/orders/${encodeURIComponent(paypalOrderId)}/capture`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            },
        );

        if (!response.ok) {
            const error = await parseError(response, `Server error: ${response.status}`);
            return { success: false, error };
        }

        const data = (await response.json()) as {
            order_id: string;
            status: string;
            message: string;
        };
        return {
            success: true,
            order_id: data.order_id,
            status: data.status,
            message: data.message,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}
