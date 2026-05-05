"use client";

import Link from "next/link";

import type { OrderSummary } from "@/app/api/shop/order-actions";

import { statusBadgeClass } from "../order-status";

interface OrderRowProps {
    order: OrderSummary;
}

const priceFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
});

export default function OrderRow({ order }: OrderRowProps) {
    const customer = `${order.customer_first_name} ${order.customer_last_name}`.trim();
    const created = dateFormatter.format(new Date(order.created_at));
    const total = priceFormatter.format(order.total_amount);

    return (
        <Link
            href={`/shop/admin/orders/${order.id}`}
            className="pixel-borders bg-foreground p-[var(--spacing-sm)] flex items-center gap-[var(--spacing-sm)]
                hover:bg-[color:var(--accent)] hover:text-[color:var(--background)] transition-colors"
        >
            <div className="flex-1 min-w-0 flex flex-col gap-[0.125rem]">
                <div className="flex items-center gap-[var(--spacing-xs)] flex-wrap">
                    <span className="main-text text-[0.875rem] truncate">
                        {customer || order.customer_email}
                    </span>
                    <span
                        className={`pixel-borders px-[0.325rem] main-text text-[0.625rem] ${statusBadgeClass(order.status)}`}
                    >
                        {order.status}
                    </span>
                </div>
                <div className="main-text text-[0.75rem] opacity-80">
                    #{order.id.slice(0, 8)} &middot; {total} &middot; {order.item_count} item
                    {order.item_count === 1 ? "" : "s"}
                </div>
                <div className="main-text text-[0.6875rem] opacity-70">
                    {created}
                    {order.tracking_number ? ` · tracking: ${order.tracking_number}` : ""}
                </div>
            </div>
            <span className="main-text text-[0.75rem] shrink-0">›</span>
        </Link>
    );
}
