"use client";

import { useRef, useState } from "react";

import type { CustomizationQueueRow } from "@/app/api/shop/order-actions";

import CustomQueueRowContent from "./custom-queue-row-content";
import CustomQueueRowTopbar from "./custom-queue-row-topbar";

interface CustomQueueRowProps {
    row: CustomizationQueueRow;
    siblings: CustomizationQueueRow[];
    busy: boolean;
    imageBusy: boolean;
    onToggle: (next: boolean) => void;
    onUploadImage: (file: File) => Promise<void>;
    onClearImage: () => Promise<void>;
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
    onToggle,
    onUploadImage,
    onClearImage,
}: CustomQueueRowProps) {
    const placed = dateFormatter.format(new Date(row.order_created_at));
    const handle =
        row.customer_discord_handle ||
        row.customer_email ||
        `${row.customer_first_name} ${row.customer_last_name}`.trim() ||
        "(no discord)";

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [confirmingClear, setConfirmingClear] = useState(false);

    const handleFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        await onUploadImage(file);
    };

    const handleConfirmClear = async () => {
        setConfirmingClear(false);
        await onClearImage();
    };

    return (
        <div
            className={`pixel-borders flex flex-col transition-opacity ${
                row.is_complete ? "opacity-60" : ""
            }`}
        >
            <CustomQueueRowTopbar
                orderId={row.order_id}
                orderIdShort={row.order_id_short}
                productName={row.product_name}
                lineQuantity={row.quantity}
                orderTotalQuantity={row.order_total_quantity}
            />
            <CustomQueueRowContent
                row={row}
                siblings={siblings}
                handle={handle}
                placed={placed}
                busy={busy}
                imageBusy={imageBusy}
                confirmingClear={confirmingClear}
                fileInputRef={fileInputRef}
                onToggle={onToggle}
                onFileChange={handleFileChange}
                onRequestClear={() => setConfirmingClear(true)}
                onConfirmClear={handleConfirmClear}
                onCancelClear={() => setConfirmingClear(false)}
            />
        </div>
    );
}
