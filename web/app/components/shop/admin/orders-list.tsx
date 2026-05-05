"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
    listOrders,
    type OrderStatus,
    type OrderSummary,
} from "@/app/api/shop/order-actions";
import { useAuth } from "@/app/context/auth-context";

import AdminTabs from "./admin-tabs";
import OrderRow from "./order-row";

const STATUS_FILTERS: { id: OrderStatus | "all"; label: string }[] = [
    { id: "all", label: "all" },
    { id: "pending", label: "pending" },
    { id: "paid", label: "paid" },
    { id: "shipped", label: "shipped" },
    { id: "delivered", label: "delivered" },
    { id: "refunded", label: "refunded" },
    { id: "failed", label: "failed" },
];

export default function OrdersList() {
    const { token } = useAuth();
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [filter, setFilter] = useState<OrderStatus | "all">("all");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        const result = await listOrders(token, {
            status: filter === "all" ? undefined : filter,
        });
        if (result.success) {
            setOrders(result.orders);
        } else {
            setError(result.error);
            setOrders([]);
        }
        setIsLoading(false);
    }, [token, filter]);

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

            <AdminTabs active="orders" />

            <div className="flex flex-wrap gap-[var(--spacing-xs)]">
                {STATUS_FILTERS.map((opt) => {
                    const isActive = filter === opt.id;
                    return (
                        <button
                            type="button"
                            key={opt.id}
                            onClick={() => setFilter(opt.id)}
                            className={`pixel-borders px-[var(--spacing-sm)] py-[0.25rem] main-text text-[0.6875rem] cursor-pointer transition-colors ${
                                isActive
                                    ? "bg-[color:var(--accent)] text-[color:var(--background)]"
                                    : "bg-foreground text-[color:var(--border)] hover:bg-[color:var(--accent)] hover:text-[color:var(--background)]"
                            }`}
                        >
                            {opt.label}
                        </button>
                    );
                })}
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
                            No orders {filter === "all" ? "yet" : `with status \"${filter}\"`}.
                        </span>
                    </div>
                ) : (
                    orders.map((o) => <OrderRow key={o.id} order={o} />)
                )}
            </div>
        </div>
    );
}
