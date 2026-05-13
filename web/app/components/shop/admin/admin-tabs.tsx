"use client";

import Link from "next/link";

type Tab = "products" | "orders" | "custom" | "pending" | "deprecated";

interface AdminTabsProps {
    active: Tab;
}

const TABS: { id: Tab; label: string; href: string }[] = [
    { id: "custom", label: "orders", href: "/shop/admin/orders/custom" },
    { id: "products", label: "products", href: "/shop/admin" },
    { id: "pending", label: "pending", href: "/shop/admin/orders/pending" },
    { id: "orders", label: "deprecated", href: "/shop/admin/orders" },
];

export default function AdminTabs({ active }: AdminTabsProps) {
    return (
        <div className="flex items-center gap-[var(--spacing-xs)]">
            {TABS.map((tab) => {
                const isActive = tab.id === active;
                return (
                    <Link
                        key={tab.id}
                        href={tab.href}
                        className={`pixel-borders px-[var(--spacing-sm)] py-[0.25rem] main-text text-[0.75rem] transition-colors ${
                            isActive
                                ? "bg-[color:var(--accent)] text-[color:var(--background)]"
                                : "bg-foreground text-[color:var(--border)] hover:bg-[color:var(--accent)] hover:text-[color:var(--background)]"
                        }`}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </div>
    );
}
