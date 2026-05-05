import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getOrder } from "@/app/api/shop/order-actions";
import OrderDetailView from "@/app/components/shop/order-detail-view";

interface PageProps {
    params: Promise<{ id: string }>;
}

function OrderBackground() {
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

export default async function CustomerOrderPage({ params }: PageProps) {
    const { id } = await params;
    const result = await getOrder(id);

    if (!result.success) {
        notFound();
    }

    const order = result.order;

    return (
        <div className="relative w-full min-h-screen">
            <OrderBackground />
            <div className="relative p-[0.75rem] md:p-[1.25rem] lg:p-[1.825rem]">
                <div className="w-full max-w-[40rem] mx-auto flex flex-col gap-[var(--spacing-md)]">
                    <div className="flex items-center justify-between gap-[var(--spacing-sm)]">
                        <span className="main-text text-[1.125rem] md:text-[1.25rem]">
                            your order
                        </span>
                        <Link
                            href="/shop"
                            className="pixel-borders px-[var(--spacing-sm)] py-[0.25rem]
                                bg-foreground text-[color:var(--border)] main-text text-[0.75rem]
                                hover:bg-[color:var(--accent)] hover:text-[color:var(--background)]
                                transition-colors"
                        >
                            back to shop
                        </Link>
                    </div>

                    <OrderDetailView order={order} />

                    <div className="main-text text-[0.6875rem] opacity-70 text-center">
                        Bookmark this page to check your order status. The link in your
                        receipt email will always work.
                    </div>
                </div>
            </div>
        </div>
    );
}
