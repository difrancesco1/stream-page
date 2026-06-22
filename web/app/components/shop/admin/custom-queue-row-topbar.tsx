"use client";

import type { ReactNode } from "react";

interface CustomQueueRowTopbarProps {
    left: ReactNode;
    right?: ReactNode;
    accent?: boolean;
}

export default function CustomQueueRowTopbar({
    left,
    right,
    accent = false,
}: CustomQueueRowTopbarProps) {
    return (
        <div
            className={`flex items-center justify-between gap-[var(--spacing-sm)]
                ${accent ? "bg-[color:var(--accent)]" : "bg-[color:var(--border)]"}
                text-[color:var(--foreground)]
                px-[var(--spacing-md)] py-[var(--spacing-sm)]`}
        >
            {left}
            {right}
        </div>
    );
}
