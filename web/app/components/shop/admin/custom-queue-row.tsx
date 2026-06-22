"use client";

import { useRef } from "react";

import Link from "next/link";

import type { CustomizationQueueRow } from "@/app/api/shop/order-actions";

import CustomQueueRowContent from "./custom-queue-row-content";
import CustomQueueRowTopbar from "./custom-queue-row-topbar";

interface CustomQueueRowProps {
    row: CustomizationQueueRow;
    siblings: CustomizationQueueRow[];
    busy: boolean;
    imageBusy: boolean;
    showNotes: boolean;
    onToggle: (next: boolean) => void;
    onUploadImage: (file: File) => Promise<void>;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
});

export default function CustomQueueRow({
    row,
    siblings,
    busy,
    imageBusy,
    showNotes,
    onToggle,
    onUploadImage,
}: CustomQueueRowProps) {
    const placed = dateFormatter.format(new Date(row.order_created_at));
    const handle =
        row.customer_discord_handle ||
        row.customer_email ||
        `${row.customer_first_name} ${row.customer_last_name}`.trim() ||
        "(no discord)";

    const hasPreorder = siblings.some((s) => s.is_preorder);

    const productLabel =
        row.quantity > 1
            ? `${row.product_name} \u00d7${row.quantity}`
            : row.product_name;

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
            className={`pixel-borders flex flex-col transition-opacity ${
                row.is_complete ? "opacity-60" : ""
            }`}
        >
            <CustomQueueRowTopbar
                accent={hasPreorder}
                left={
                    <Link
                        href={`/shop/admin/orders/${row.order_id}`}
                        className="main-text !text-white text-[0.6875rem] uppercase
                            text-[color:var(--foreground)] hover:text-[color:var(--accent)]"
                    >
                        order id #{row.order_id_short}
                    </Link>
                }
                right={
                    <span className="main-text !text-white text-[0.6875rem] uppercase opacity-80">
                        {productLabel} / {row.order_total_quantity}
                    </span>
                }
            />
            <CustomQueueRowContent
                row={row}
                siblings={siblings}
                handle={handle}
                placed={placed}
                busy={busy}
                imageBusy={imageBusy}
                showNotes={showNotes}
                fileInputRef={fileInputRef}
                onToggle={onToggle}
                onFileChange={handleFileChange}
            />
        </div>
    );
}
