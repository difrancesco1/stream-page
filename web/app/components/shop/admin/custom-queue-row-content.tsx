"use client";

import { type RefObject } from "react";

import Image from "next/image";

import type { CustomizationQueueRow } from "@/app/api/shop/order-actions";

import { CopyButton, Field, formatShippingAddress } from "./queue-row-helpers";

interface CustomQueueRowContentProps {
    row: CustomizationQueueRow;
    siblings: CustomizationQueueRow[];
    handle: string;
    placed: string;
    busy: boolean;
    imageBusy: boolean;
    showNotes: boolean;
    fileInputRef: RefObject<HTMLInputElement | null>;
    onToggle: (next: boolean) => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
    onRemoveImage: () => void | Promise<void>;
}

function siblingLabel(s: CustomizationQueueRow): string {
    if (s.kind === "item" && s.quantity > 1) {
        return `${s.product_name} \u00d7${s.quantity}`;
    }
    return s.product_name;
}

export default function CustomQueueRowContent({
    row,
    siblings,
    handle,
    placed,
    busy,
    imageBusy,
    showNotes,
    fileInputRef,
    onToggle,
    onFileChange,
    onRemoveImage,
}: CustomQueueRowContentProps) {
    const isCustom = row.kind === "custom";
    const cardLabel = isCustom ? "card name" : "product";
    const shippingAddress = formatShippingAddress(row);
    const customerName =
        `${row.customer_first_name} ${row.customer_last_name}`.trim();

    return (
        <div className="bg-foreground p-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)]">
            <div className="flex justify-between gap-[var(--spacing-sm)]">
                <Field label="discord">{handle}</Field>
                <Field label="date">{placed}</Field>
            </div>
            <hr />

            <div className="flex flex-col gap-[var(--spacing-sm)]">
                <div className="flex-1 min-w-0 flex flex-col gap-[var(--spacing-sm)]">
                    <Field label={cardLabel} valueClassName="font-bold">
                        {row.card_name}
                    </Field>

                    {showNotes && isCustom && row.description && (
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
                            className="pixel-borders bg-background p-[0.25rem] self-start w-[8rem]"
                        >
                            <div className="relative w-full aspect-square">
                                <Image
                                    src={row.image_url}
                                    alt={`Card art for ${row.card_name}`}
                                    fill
                                    sizes="128px"
                                    className="object-contain"
                                />
                            </div>
                        </a>
                    )}
                </div>

                {siblings.length > 0 && (
                    <div className="flex flex-col leading-none gap-[0.25rem] min-w-0">
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

            <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-sm)]">
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
                            {row.image_url && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                "Remove this image? This can't be undone.",
                                            )
                                        ) {
                                            void onRemoveImage();
                                        }
                                    }}
                                    disabled={imageBusy}
                                    className="pixel-borders pixel-btn-border px-[var(--spacing-sm)] py-[0.25rem]
                                        !bg-transparent !text-red-700 main-text text-[0.6875rem] cursor-pointer
                                        hover:bg-red-500/20
                                        disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {imageBusy ? "removing..." : "remove image"}
                                </button>
                            )}
                        </>
                    )}
                    <CopyButton label="email" value={row.customer_email} />
                    <CopyButton label="name" value={customerName} />
                    {shippingAddress && (
                        <CopyButton label="address" value={shippingAddress} />
                    )}
                    <span className="main-text text-[0.625rem] uppercase opacity-80 pl-1">
                            Shipping: {row.shipping_method ?? "—"}
                    </span>
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
