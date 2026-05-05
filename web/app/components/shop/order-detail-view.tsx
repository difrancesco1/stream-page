import type { OrderDetail } from "@/app/api/shop/order-actions";

import { statusBadgeClass } from "./order-status";

interface OrderDetailViewProps {
    order: OrderDetail;
}

const priceFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
});

function formatDate(value: string | null): string | null {
    if (!value) return null;
    try {
        return dateFormatter.format(new Date(value));
    } catch {
        return value;
    }
}

export default function OrderDetailView({ order }: OrderDetailViewProps) {
    const fullName = `${order.customer_first_name} ${order.customer_last_name}`.trim();
    const created = formatDate(order.created_at);
    const shipped = formatDate(order.shipped_at);

    return (
        <div className="flex flex-col gap-[var(--spacing-md)]">
            <div className="pixel-borders bg-foreground p-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-xs)]">
                <div className="flex items-center justify-between gap-[var(--spacing-sm)] flex-wrap">
                    <span className="main-text text-[0.875rem]">
                        order #{order.id.slice(0, 8)}
                    </span>
                    <span
                        className={`pixel-borders px-[0.4rem] main-text text-[0.6875rem] ${statusBadgeClass(order.status)}`}
                    >
                        {order.status}
                    </span>
                </div>
                {created && (
                    <div className="main-text text-[0.6875rem] opacity-70">
                        placed {created}
                    </div>
                )}
            </div>

            <section className="pixel-borders bg-foreground p-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-xs)]">
                <div className="main-text text-[0.75rem] opacity-70">items</div>
                <div className="flex flex-col gap-[0.25rem]">
                    {order.items.map((item, idx) => (
                        <div
                            key={`${item.product_id}-${idx}`}
                            className="flex items-center justify-between gap-[var(--spacing-sm)]"
                        >
                            <div className="main-text text-[0.8125rem] truncate">
                                {item.product_name}
                                <span className="opacity-70"> × {item.quantity}</span>
                            </div>
                            <div className="main-text text-[0.75rem] opacity-80 shrink-0">
                                {priceFormatter.format(item.line_total)}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between mt-[var(--spacing-xs)]">
                    <span className="main-text text-[0.8125rem]">total</span>
                    <span className="main-text text-[0.8125rem]">
                        {priceFormatter.format(order.total_amount)}
                    </span>
                </div>
            </section>

            <section className="pixel-borders bg-foreground p-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-xs)]">
                <div className="main-text text-[0.75rem] opacity-70">shipping</div>
                <div className="main-text text-[0.8125rem] flex flex-col gap-[0.125rem]">
                    {fullName && <span>{fullName}</span>}
                    <span>{order.shipping_street}</span>
                    <span>
                        {order.shipping_city}, {order.shipping_state} {order.shipping_zip}
                    </span>
                    <span>{order.shipping_country}</span>
                </div>
                <div className="main-text text-[0.6875rem] opacity-70 flex flex-col gap-[0.125rem] mt-[0.25rem]">
                    {order.customer_email && <span>{order.customer_email}</span>}
                    {order.customer_phone && <span>{order.customer_phone}</span>}
                </div>
            </section>

            {(order.tracking_number || order.tracking_url || shipped) && (
                <section className="pixel-borders bg-foreground p-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-xs)]">
                    <div className="main-text text-[0.75rem] opacity-70">tracking</div>
                    {order.tracking_carrier && (
                        <div className="main-text text-[0.8125rem]">
                            carrier: {order.tracking_carrier}
                        </div>
                    )}
                    {order.tracking_number && (
                        <div className="main-text text-[0.8125rem]">
                            number: {order.tracking_number}
                        </div>
                    )}
                    {order.tracking_url && (
                        <a
                            href={order.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="main-text text-[0.8125rem] underline break-all"
                        >
                            {order.tracking_url}
                        </a>
                    )}
                    {shipped && (
                        <div className="main-text text-[0.6875rem] opacity-70">
                            shipped {shipped}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
