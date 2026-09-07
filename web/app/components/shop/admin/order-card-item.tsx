"use client";

import { useRef } from "react";

import Image from "next/image";

import type { CustomizationQueueRow } from "@/app/api/shop/order-actions";

interface OrderCardItemProps {
    row: CustomizationQueueRow;
    imageBusy: boolean;
    onUploadImage: (file: File) => Promise<void>;
    onRemoveImage: () => Promise<void>;
}

function itemTitle(row: CustomizationQueueRow): string {
    if (row.kind === "custom") return row.card_name;
    return row.quantity > 1
        ? `${row.product_name} \u00d7${row.quantity}`
        : row.product_name;
}

export default function OrderCardItem({
    row,
    imageBusy,
    onUploadImage,
    onRemoveImage,
}: OrderCardItemProps) {
    const isCustom = row.kind === "custom";
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        await onUploadImage(file);
    };

    return (
        <div
            className={`flex gap-[var(--spacing-sm)] py-[var(--spacing-xs)] ${
                row.is_complete ? "opacity-50" : ""
            }`}
        >
            {isCustom && row.image_url && (
                <a
                    href={row.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pixel-borders bg-background p-[0.25rem] self-start w-[4rem] shrink-0"
                >
                    <div className="relative w-full aspect-square">
                        <Image
                            src={row.image_url}
                            alt={`Card art for ${row.card_name}`}
                            fill
                            sizes="64px"
                            className="object-contain"
                        />
                    </div>
                </a>
            )}

            <div className="flex-1 min-w-0 flex flex-col gap-[0.25rem]">
                <div className="flex items-baseline gap-[var(--spacing-sm)]">
                    <span
                        className={`main-text text-[0.875rem] break-words font-bold shrink-0 ${
                            row.is_complete ? "line-through" : ""
                        }`}
                    >
                        {itemTitle(row)}
                    </span>

                    {isCustom && row.description && (
                        <span className="main-text text-[0.6875rem] opacity-70 whitespace-pre-wrap break-words text-right min-w-0 flex-1">
                            {row.description}
                        </span>
                    )}
                </div>

                {isCustom && (
                    <>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={imageBusy}
                            className="pixel-borders pixel-btn-border px-[var(--spacing-sm)] py-[0.25rem] self-start
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
                                className="pixel-borders pixel-btn-border px-[var(--spacing-sm)] py-[0.25rem] self-start
                                    !bg-transparent !text-red-700 main-text text-[0.6875rem] cursor-pointer
                                    hover:bg-red-500/20
                                    disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {imageBusy ? "removing..." : "remove image"}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
