"use client";

import CardHeader from "@/app/components/shared/card-header";
import type { TopbarBackIcon } from "@/app/components/shared/topbar";

import CartSection from "./cart-section";
import { useCart } from "./cart-context";
import type { ShopItem } from "./types";

interface ShopShellProps {
  items: ShopItem[];
  title?: string;
  tabs?: { title: string }[];
  activeTab?: { title: string };
  setActiveTab?: (tab: { title: string }) => void;
  backHref?: string;
  backIcon?: TopbarBackIcon;
  backLabel?: string;
  children: React.ReactNode;
}

export default function ShopShell({
  items,
  title = "shop",
  tabs,
  activeTab,
  setActiveTab,
  backHref,
  backIcon,
  backLabel,
  children,
}: ShopShellProps) {
  const { cart, remove } = useCart();

  const handlePay = () => {
    // TODO: open customer-info modal and POST /shop/orders/create
    console.log("pay", cart);
  };

  const showTabs = Boolean(tabs && activeTab && setActiveTab);

  return (
    <div
      className="relative wrapper pixel-borders pixel-card w-full
      sm:max-w-[64rem] md:max-w-[72rem] lg:max-w-[55rem]
      h-full bg-foreground overflow-hidden"
    >
      <CardHeader
        title={title}
        variant="section"
        showTabs={showTabs}
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backHref={backHref}
        backIcon={backIcon}
        backLabel={backLabel}
      >
        <div className="flex-1 min-h-0 flex">
          {children}
        </div>
        <div className="shrink-0 px-[var(--spacing-sm)] pb-[var(--spacing-sm)] pt-[var(--spacing-sm)]">
          <CartSection
            items={items}
            cart={cart}
            onRemove={remove}
            onPay={handlePay}
          />
        </div>
      </CardHeader>
    </div>
  );
}
