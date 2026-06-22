"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CustomizationQueueRow } from "@/app/api/shop/order-actions";

import CopyAllIcon from "@mui/icons-material/CopyAll";

export function formatShippingAddress(row: CustomizationQueueRow): string {
    const cityLine = [
        row.shipping_city,
        [row.shipping_state, row.shipping_zip].filter(Boolean).join(" "),
    ]
        .filter(Boolean)
        .join(", ");
    return [row.shipping_street, cityLine, row.shipping_country]
        .filter((line) => line && line.trim().length > 0)
        .join("\n");
}

export function CopyButton({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        },
        [],
    );

    const onClick = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard API can fail in insecure contexts; silently no-op so
            // the admin can still read the value off the order detail page.
        }
    }, [value]);

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!value}
            className="pixel-borders pixel-btn-border px-[var(--spacing-sm)] py-[0.25rem]
                main-text text-[0.625rem] uppercase cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {copied ? "copied!" : ` ${label} `} <CopyAllIcon className="!w-4 !h-4" />
        </button>
    );
}

export function Field({
    label,
    children,
    valueClassName,
}: {
    label: string;
    children: React.ReactNode;
    valueClassName?: string;
}) {
    return (
        <div className="flex flex-col min-w-0 leading-none">
            <span className="main-text text-[0.625rem] uppercase opacity-60">
                {label}
            </span>
            <div
                className={`main-text text-[0.875rem] break-words ${valueClassName ?? ""}`}
            >
                {children}
            </div>
        </div>
    );
}
