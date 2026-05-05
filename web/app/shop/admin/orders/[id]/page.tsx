"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

import { getOrder, type OrderDetail } from "@/app/api/shop/order-actions";
import OrderEditForm from "@/app/components/shop/admin/order-edit-form";
import OrderDetailView from "@/app/components/shop/order-detail-view";
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

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function ShopAdminOrderDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const { user, isLoading, isAuthenticated } = useAuth();

    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoadingOrder, setIsLoadingOrder] = useState(true);

    const isRosie =
        isAuthenticated && user?.username?.toLowerCase() === "rosie";

    const fetchOrder = useCallback(async () => {
        setIsLoadingOrder(true);
        setLoadError(null);
        const result = await getOrder(id);
        if (result.success) {
            setOrder(result.order);
        } else {
            setLoadError(result.error);
            setOrder(null);
        }
        setIsLoadingOrder(false);
    }, [id]);

    useEffect(() => {
        if (isRosie) {
            fetchOrder();
        }
    }, [isRosie, fetchOrder]);

    if (isLoading) {
        return (
            <div className="relative w-full h-screen">
                <AdminBackground />
            </div>
        );
    }

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
                <div className="w-full max-w-[50rem] mx-auto flex flex-col gap-[var(--spacing-md)]">
                    <div className="flex items-center justify-between gap-[var(--spacing-sm)]">
                        <span className="main-text text-[1.125rem] md:text-[1.25rem]">
                            order detail
                        </span>
                        <Link
                            href="/shop/admin/orders"
                            className="pixel-borders px-[var(--spacing-sm)] py-[0.25rem]
                                bg-foreground text-[color:var(--border)] main-text text-[0.75rem]
                                hover:bg-[color:var(--accent)] hover:text-[color:var(--background)]
                                transition-colors"
                        >
                            back to orders
                        </Link>
                    </div>

                    {isLoadingOrder ? (
                        <div className="main-text text-[0.875rem] opacity-70">
                            Loading...
                        </div>
                    ) : loadError ? (
                        <div className="pixel-borders bg-foreground p-[var(--spacing-sm)]">
                            <span className="main-text text-[0.75rem] text-red-400">
                                {loadError}
                            </span>
                        </div>
                    ) : order ? (
                        <>
                            <OrderDetailView order={order} />
                            <OrderEditForm
                                order={order}
                                onUpdated={(next) => setOrder(next)}
                            />
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
