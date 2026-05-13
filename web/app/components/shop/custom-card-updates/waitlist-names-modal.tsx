"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import type { WaitlistEntry } from "@/app/api/shop/order-actions";

interface WaitlistNamesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entries: WaitlistEntry[];
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
});

export default function WaitlistNamesModal({
    open,
    onOpenChange,
    entries,
}: WaitlistNamesModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={true}
                className="pixel-borders pixel-card bg-foreground border-[length:var(--border-width)] border-border max-h-[80vh] overflow-y-auto p-[var(--spacing-md)] max-w-[20rem]"
            >
                <DialogTitle className="main-text text-[1.1rem] mb-[var(--spacing-sm)]">
                    waitlist
                </DialogTitle>

                {entries.length === 0 ? (
                    <p className="main-text text-[0.75rem] opacity-70">
                        No one on the waitlist.
                    </p>
                ) : (
                    <ol className="flex flex-col gap-[0.25rem]">
                        {entries.map((entry, idx) => (
                            <li
                                key={entry.id}
                                className="flex items-center justify-between gap-[var(--spacing-sm)] main-text text-[0.875rem]"
                            >
                                <span className="flex min-w-0 items-baseline gap-[var(--spacing-xs)]">
                                    <span className="opacity-50 shrink-0 text-[0.75rem]">
                                        {idx + 1}.
                                    </span>
                                    <span className="truncate">
                                        {entry.customer_discord_handle}
                                    </span>
                                </span>
                                <span className="opacity-60 text-[0.75rem] shrink-0">
                                    {dateFormatter.format(
                                        new Date(entry.order_created_at),
                                    )}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
            </DialogContent>
        </Dialog>
    );
}
