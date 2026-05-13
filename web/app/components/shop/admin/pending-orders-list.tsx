"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
    listOrders,
    type OrderSummary,
} from "@/app/api/shop/order-actions";
import { useAuth } from "@/app/context/auth-context";

import AdminTabs from "./admin-tabs";
import OrderRow from "./order-row";

export default function PendingOrdersList() {
    const { token } = useAuth();
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        const result = await listOrders(token, { status: "pending" });
        if (result.success) {
            setOrders(result.orders);
        } else {
            setError(result.error);
            setOrders([]);
        }
        setIsLoading(false);
    }, [token]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    return (
        <div className="w-full max-w-[50rem] mx-auto flex flex-col gap-[var(--spacing-md)]">
            <div className="flex items-center justify-between gap-[var(--spacing-sm)]">
                <span className="main-text text-[1.125rem] md:text-[1.25rem]">
                    manage shop
                </span>
                <Link
                    href="/shop"
                    className="pixel-borders px-[var(--spacing-sm)] py-[0.25rem]
                        bg-foreground text-[color:var(--border)] main-text text-[0.75rem]
                        hover:bg-[color:var(--accent)] hover:text-[color:var(--background)]
                        transition-colors"
                >
                    back to shop
                </Link>
            </div>

            <AdminTabs active="pending" />

            <div className="main-text text-[0.875rem] text-[color:var(--border)]">
                pending ({orders.length})
            </div>

            <div className="flex flex-col gap-[var(--spacing-sm)]">
                {isLoading ? (
                    <div className="main-text text-[0.875rem] text-[color:var(--border)] opacity-70">
                        Loading...
                    </div>
                ) : error ? (
                    <div className="pixel-borders bg-foreground p-[var(--spacing-sm)]">
                        <span className="main-text text-[0.75rem] text-red-400">
                            {error}
                        </span>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="pixel-borders bg-foreground p-[var(--spacing-md)]">
                        <span className="main-text text-[0.875rem] text-[color:var(--border)] opacity-70">
                            No pending orders.
                        </span>
                    </div>
                ) : (
                    orders.map((o) => <OrderRow key={o.id} order={o} />)
                )}
            </div>
        </div>
    );
}
