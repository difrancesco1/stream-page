"use client";

import Link from "next/link";

import type { CustomizationQueueRow } from "@/app/api/shop/order-actions";

import OrderCardItem from "./order-card-item";
import { CopyButton, Field, formatShippingAddress } from "./queue-row-helpers";

interface OrderCardProps {
    rows: CustomizationQueueRow[];
    busyIds: Set<string>;
    imageBusyIds: Set<string>;
    onToggle: (row: CustomizationQueueRow, next: boolean) => void;
    onUploadImage: (row: CustomizationQueueRow, file: File) => Promise<void>;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
});

export default function OrderCard({
    rows,
    busyIds,
    imageBusyIds,
    onToggle,
    onUploadImage,
}: OrderCardProps) {
    const head = rows[0];
    if (!head) return null;

    const allComplete = rows.every((r) => r.is_complete);
    const isPreorder = rows.some((r) => r.is_preorder);
    const orderBusy = rows.some((r) => busyIds.has(r.id));

    const handleToggleOrder = (next: boolean) => {
        for (const r of rows) {
            if (r.is_complete !== next) onToggle(r, next);
        }
    };
    const placed = dateFormatter.format(new Date(head.order_created_at));
    const handle =
        head.customer_discord_handle ||
        head.customer_email ||
        `${head.customer_first_name} ${head.customer_last_name}`.trim() ||
        "(no discord)";
    const customerName =
        `${head.customer_first_name} ${head.customer_last_name}`.trim();
    const shippingAddress = formatShippingAddress(head);

    return (
        <div
            className={`pixel-borders flex flex-col transition-opacity ${
                allComplete ? "opacity-60" : ""
            }`}
        >
            <div
                className={`flex items-center justify-between gap-[var(--spacing-sm)]
                    ${isPreorder ? "bg-[color:var(--accent)]" : "bg-[color:var(--border)]"}
                    text-[color:var(--foreground)]
                    px-[var(--spacing-md)] py-[var(--spacing-sm)]`}
            >
                <Link
                    href={`/shop/admin/orders/${head.order_id}`}
                    className="main-text !text-white text-[0.6875rem] uppercase
                        text-[color:var(--foreground)] hover:text-[color:var(--accent)]"
                >
                    order id #{head.order_id_short}
                </Link>
                <span className="main-text !text-white text-[0.6875rem] uppercase opacity-80">
                    {isPreorder ? "preorder / " : ""}
                    {head.order_total_quantity} item
                    {head.order_total_quantity === 1 ? "" : "s"}
                </span>
            </div>

            <div className="bg-foreground p-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)]">
                <div className="flex justify-between gap-[var(--spacing-sm)]">
                    <Field label="discord">{handle}</Field>
                    <Field label="date">{placed}</Field>
                </div>
                <hr />

                <div className="flex flex-col leading-none gap-[0.25rem] min-w-0">
                    <span className="main-text text-[0.625rem] uppercase opacity-60">
                        items
                    </span>
                    <div className="flex flex-col divide-y divide-[color:var(--border)]/20">
                        {rows.map((r) => (
                            <OrderCardItem
                                key={r.id}
                                row={r}
                                imageBusy={imageBusyIds.has(r.id)}
                                onUploadImage={(file) =>
                                    onUploadImage(r, file)
                                }
                            />
                        ))}
                    </div>
                </div>

                <hr />

                <div className="flex flex-wrap items-center gap-[var(--spacing-xs)]">
                    <CopyButton label="email" value={head.customer_email} />
                    <CopyButton label="name" value={customerName} />
                    {shippingAddress && (
                        <CopyButton label="address" value={shippingAddress} />
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-sm)]">
                    <span className="main-text text-[0.625rem] uppercase opacity-80">
                        Shipping: {head.shipping_method ?? "—"}
                    </span>

                    <label className="flex items-center gap-[var(--spacing-xs)] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={allComplete}
                            disabled={orderBusy}
                            onChange={(e) =>
                                handleToggleOrder(e.target.checked)
                            }
                            className="w-[1.125rem] h-[1.125rem] cursor-pointer accent-[color:var(--accent)] disabled:cursor-not-allowed"
                            aria-label={
                                allComplete
                                    ? "mark order as not done"
                                    : "mark order as done"
                            }
                        />
                        <span className="main-text text-[0.625rem] uppercase opacity-60">
                            complete
                        </span>
                    </label>
                </div>
            </div>
        </div>
    );
}
