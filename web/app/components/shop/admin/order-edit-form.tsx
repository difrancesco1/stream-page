"use client";

import { useState } from "react";

import {
    updateOrder,
    type OrderDetail,
    type OrderStatus,
    type OrderUpdatePatch,
} from "@/app/api/shop/order-actions";
import { useAuth } from "@/app/context/auth-context";

interface OrderEditFormProps {
    order: OrderDetail;
    onUpdated: (next: OrderDetail) => void;
}

const STATUS_OPTIONS: OrderStatus[] = [
    "pending",
    "paid",
    "shipped",
    "delivered",
    "failed",
    "refunded",
];

export default function OrderEditForm({ order, onUpdated }: OrderEditFormProps) {
    const { token } = useAuth();
    const [status, setStatus] = useState<OrderStatus>(order.status);
    const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? "");
    const [trackingCarrier, setTrackingCarrier] = useState(order.tracking_carrier ?? "");
    const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        setError(null);
        setSuccess(null);
        setBusy(true);

        const patch: OrderUpdatePatch = {
            status,
            tracking_number: trackingNumber.trim() || null,
            tracking_carrier: trackingCarrier.trim() || null,
            tracking_url: trackingUrl.trim() || null,
        };

        const result = await updateOrder(token, order.id, patch);
        setBusy(false);

        if (result.success) {
            setSuccess("Saved.");
            onUpdated(result.order);
        } else {
            setError(result.error);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="pixel-borders bg-foreground p-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)]"
        >
            <span className="main-text text-[0.875rem]">edit order</span>

            <label className="flex flex-col gap-[0.25rem]">
                <span className="main-text text-[0.75rem] opacity-70">status</span>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as OrderStatus)}
                    className="pixel-borders bg-background main-text text-[0.8125rem] px-[var(--spacing-xs)] py-[0.25rem]"
                >
                    {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex flex-col gap-[0.25rem]">
                <span className="main-text text-[0.75rem] opacity-70">tracking carrier</span>
                <input
                    type="text"
                    value={trackingCarrier}
                    onChange={(e) => setTrackingCarrier(e.target.value)}
                    placeholder="USPS, UPS, FedEx, DHL..."
                    className="pixel-borders bg-background main-text text-[0.8125rem] px-[var(--spacing-xs)] py-[0.25rem]"
                />
            </label>

            <label className="flex flex-col gap-[0.25rem]">
                <span className="main-text text-[0.75rem] opacity-70">tracking number</span>
                <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="pixel-borders bg-background main-text text-[0.8125rem] px-[var(--spacing-xs)] py-[0.25rem]"
                />
            </label>

            <label className="flex flex-col gap-[0.25rem]">
                <span className="main-text text-[0.75rem] opacity-70">tracking url</span>
                <input
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://..."
                    className="pixel-borders bg-background main-text text-[0.8125rem] px-[var(--spacing-xs)] py-[0.25rem]"
                />
            </label>

            {order.shipped_at && (
                <div className="main-text text-[0.6875rem] opacity-70">
                    shipped_at: {order.shipped_at} (auto-set on first transition to shipped)
                </div>
            )}

            {error && (
                <div className="main-text text-[0.75rem] text-red-400">{error}</div>
            )}
            {success && (
                <div className="main-text text-[0.75rem] text-emerald-500">{success}</div>
            )}

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={busy}
                    className="pixel-borders pixel-btn-border px-[var(--spacing-sm)] py-[0.25rem]
                        main-text text-[0.75rem] cursor-pointer
                        disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {busy ? "saving..." : "save"}
                </button>
            </div>
        </form>
    );
}
