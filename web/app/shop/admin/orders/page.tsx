"use client";

import Image from "next/image";
import Link from "next/link";

import OrdersList from "@/app/components/shop/admin/orders-list";
import { useAuth } from "@/app/context/auth-context";

function AdminBackground() {
    return (
        <Image
            src="/background.gif"
            alt="Background image"
            fill
            className="object-cover"
            quality={0}
            priority
        />
    );
}

export default function ShopAdminOrdersPage() {
    const { user, isLoading, isAuthenticated } = useAuth();

    if (isLoading) {
        return (
            <div className="relative w-full h-screen">
                <AdminBackground />
            </div>
        );
    }

    const isRosie =
        isAuthenticated && user?.username?.toLowerCase() === "rosie";

    if (!isRosie) {
        return (
            <div className="relative w-full h-screen flex items-center justify-center p-[1rem]">
                <AdminBackground />
                <div className="relative pixel-borders bg-foreground p-[var(--spacing-md)] flex flex-col gap-[var(--spacing-sm)] items-center max-w-[20rem] text-center">
                    <span className="main-text text-[1rem]">Not authorized</span>
                    <span className="main-text text-[0.75rem] text-[color:var(--border)] opacity-70">
                        Only the page creator can manage the shop.
                    </span>
                    <Link
                        href="/shop"
                        className="pixel-borders px-[var(--spacing-sm)] py-[0.25rem]
                            bg-background text-[color:var(--border)] main-text text-[0.75rem]
                            hover:bg-[color:var(--accent)] hover:text-[color:var(--background)]
                            transition-colors"
                    >
                        back to shop
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full min-h-screen">
            <AdminBackground />
            <div className="relative p-[0.75rem] md:p-[1.25rem] lg:p-[1.825rem]">
                <OrdersList />
            </div>
        </div>
    );
}
