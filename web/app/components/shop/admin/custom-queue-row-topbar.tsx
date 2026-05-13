"use client";

import Link from "next/link";

interface CustomQueueRowTopbarProps {
    orderId: string;
    orderIdShort: string;
    productName: string;
    lineQuantity: number;
    orderTotalQuantity: number;
}

export default function CustomQueueRowTopbar({
    orderId,
    orderIdShort,
    productName,
    lineQuantity,
    orderTotalQuantity,
}: CustomQueueRowTopbarProps) {
    const productLabel =
        lineQuantity > 1 ? `${productName} \u00d7${lineQuantity}` : productName;

    return (
        <div
            className="flex items-center justify-between gap-[var(--spacing-sm)]
                bg-[color:var(--border)] text-[color:var(--foreground)]
                px-[var(--spacing-md)] py-[var(--spacing-sm)]"
        >
            <Link
                href={`/shop/admin/orders/${orderId}`}
                className="main-text !text-white text-[0.6875rem] uppercase
                    text-[color:var(--foreground)] hover:text-[color:var(--accent)]"
            >
                order id #{orderIdShort}
            </Link>
            <span className="main-text !text-white text-[0.6875rem] uppercase opacity-80">
                {productLabel} / {orderTotalQuantity}
            </span>
        </div>
    );
}
