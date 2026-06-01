"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { CustomizationQueueRow } from "@/app/api/shop/order-actions";

import CopyAllIcon from '@mui/icons-material/CopyAll';

interface CustomQueueRowContentProps {
    row: CustomizationQueueRow;
    siblings: CustomizationQueueRow[];
    handle: string;
    placed: string;
    busy: boolean;
    imageBusy: boolean;
    fileInputRef: RefObject<HTMLInputElement | null>;
    onToggle: (next: boolean) => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
}

function siblingLabel(s: CustomizationQueueRow): string {
    if (s.kind === "item" && s.quantity > 1) {
        return `${s.product_name} \u00d7${s.quantity}`;
    }
    return s.product_name;
}

function formatShippingAddress(row: CustomizationQueueRow): string {
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

function CopyButton({ label, value }: { label: string; value: string }) {
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

function Field({
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

export default function CustomQueueRowContent({
    row,
    siblings,
    handle,
    placed,
    busy,
    imageBusy,
    fileInputRef,
    onToggle,
    onFileChange,
}: CustomQueueRowContentProps) {
    const isCustom = row.kind === "custom";
    const cardLabel = isCustom ? "card name" : "product";
    const shippingAddress = formatShippingAddress(row);
    const customerName =
        `${row.customer_first_name} ${row.customer_last_name}`.trim();

    return (
        <div className="bg-foreground p-[var(--spacing-md)] flex flex-col gap-[var(--spacing-md)]">
            <div className="flex justify-between gap-[var(--spacing-md)]">
                <Field label="discord">{handle}</Field>
                <Field label="date">{placed}</Field>
            </div>
            <hr />

            <div className="flex justify-between gap-[var(--spacing-md)]">
                <div className="flex-1 min-w-0 flex flex-col gap-[var(--spacing-md)]">
                    <Field label={cardLabel} valueClassName="font-bold">
                        {row.card_name}
                    </Field>

                    {row.description && (
                        <Field
                            label="notes"
                            valueClassName="whitespace-pre-wrap"
                        >
                            {row.description}
                        </Field>
                    )}

                    {isCustom && row.image_url && (
                        <a
                            href={row.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pixel-borders bg-background p-[0.25rem] self-start max-w-[12rem]"
                        >
                            {/* Plain <img> on purpose: Supabase URLs are external
                                and we don't want to plumb domains through next.config. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={row.image_url}
                                alt={`Card art for ${row.card_name}`}
                                className="block max-w-full h-auto"
                            />
                        </a>
                    )}
                </div>

                {siblings.length > 0 && (
                    <div className="flex flex-col leading-none gap-[0.25rem] shrink-0 max-w-[14rem]">
                        <span className="main-text text-[0.625rem] uppercase opacity-60">
                            order items
                        </span>
                        <ul className="flex flex-col gap-[0.125rem]">
                            {siblings.map((s) => (
                                <li
                                    key={s.id}
                                    className={`main-text text-[0.75rem] break-words ${
                                        s.is_complete
                                            ? "line-through opacity-50"
                                            : ""
                                    }`}
                                >
                                    {siblingLabel(s)}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <hr />

            <div className="flex items-center justify-between gap-[var(--spacing-sm)]">
                <div className="flex flex-wrap items-center gap-[var(--spacing-xs)]">
                    {isCustom && (
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={onFileChange}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={imageBusy}
                                className="pixel-borders pixel-btn-border px-[var(--spacing-sm)] py-[0.25rem]
                                    !bg-transparent !text-border main-text text-[0.6875rem] cursor-pointer
                                    hover:bg-red-500/20 hover:text-red-700
                                    disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {imageBusy
                                    ? "uploading..."
                                    : row.image_url
                                      ? "replace image"
                                      : "attach image"}
                            </button>
                        </>
                    )}

                    <CopyButton label="name" value={customerName} />
                    <CopyButton label="address" value={shippingAddress} />
                    <CopyButton label="email" value={row.customer_email} />
                </div>

                <label className="flex items-center gap-[var(--spacing-xs)] cursor-pointer">
                    <input
                        type="checkbox"
                        checked={row.is_complete}
                        disabled={busy}
                        onChange={(e) => onToggle(e.target.checked)}
                        className="w-[1.125rem] h-[1.125rem] cursor-pointer accent-[color:var(--accent)] disabled:cursor-not-allowed"
                        aria-label={
                            row.is_complete
                                ? "mark as not done"
                                : "mark as done"
                        }
                    />
                    <span className="main-text text-[0.625rem] uppercase opacity-60">
                        complete
                    </span>
                </label>
            </div>
        </div>
    );
}
