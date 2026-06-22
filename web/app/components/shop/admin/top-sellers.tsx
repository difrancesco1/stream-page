"use client";

import { useMemo, useState } from "react";

import type { CustomizationQueueRow } from "@/app/api/shop/order-actions";

import CustomQueueRowTopbar from "./custom-queue-row-topbar";

interface TopSellersProps {
    rows: CustomizationQueueRow[];
}

export default function TopSellers({ rows }: TopSellersProps) {
    const [preorderOnly, setPreorderOnly] = useState(true);

    const sellers = useMemo(() => {
        const ordersByProduct = new Map<string, Set<string>>();
        for (const r of rows) {
            if (r.kind !== "item") continue;
            if (preorderOnly && !r.is_preorder) continue;
            const set = ordersByProduct.get(r.product_name);
            if (set) set.add(r.order_id);
            else ordersByProduct.set(r.product_name, new Set([r.order_id]));
        }
        return Array.from(ordersByProduct.entries())
            .map(([name, set]) => ({ name, count: set.size }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }, [rows, preorderOnly]);

    return (
        <div className="pixel-borders flex flex-col">
            <CustomQueueRowTopbar
                left={
                    <span className="main-text !text-white text-[0.6875rem] uppercase">
                        top sellers
                    </span>
                }
                right={
                    <button
                        type="button"
                        onClick={() => setPreorderOnly((v) => !v)}
                        aria-pressed={preorderOnly}
                        className={`pixel-borders px-[var(--spacing-sm)] py-[0.125rem] main-text text-[0.6875rem] uppercase transition-colors ${
                            preorderOnly
                                ? "bg-foreground text-[color:var(--border)]"
                                : "!bg-transparent !text-white opacity-80 hover:opacity-100"
                        }`}
                    >
                        pre-orders only
                    </button>
                }
            />

            <div className="bg-foreground p-[var(--spacing-sm)]">
                {sellers.length === 0 ? (
                    <span className="main-text text-[0.75rem] opacity-70">
                        {preorderOnly
                            ? "No pre-order sales yet."
                            : "No sales yet."}
                    </span>
                ) : (
                    <div className="max-h-[6rem] overflow-y-auto flex flex-col divide-y divide-[color:var(--border)]/20 pr-[var(--spacing-xs)]">
                        {sellers.map((s) => (
                            <div
                                key={s.name}
                                className="flex items-center justify-between gap-[var(--spacing-sm)] py-[var(--spacing-xs)]"
                            >
                                <span className="main-text text-[0.875rem] break-words min-w-0">
                                    {s.name}
                                </span>
                                <span className="main-text text-[0.75rem] opacity-80 whitespace-nowrap shrink-0">
                                    {s.count} order{s.count === 1 ? "" : "s"}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
