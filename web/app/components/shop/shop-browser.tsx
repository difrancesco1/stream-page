"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import type { ProductCategory } from "@/app/api/shop/actions";
import type { WaitlistEntry } from "@/app/api/shop/order-actions";

import ShopShell from "./shop-modal";
import ShopSection from "./shop-section";
import WaitlistContent from "./custom-card-updates/waitlist-content";
import type { ShopItem } from "./types";

type TabKey = "all" | "custom" | Exclude<ProductCategory, "custom">;

const TABS: { title: TabKey; className?: string }[] = [
  { title: "all" },
  { title: "tokens" },
  { title: "stickers" },
  { title: "etc" },
  { title: "custom", className: "lg:hidden ml-auto" },
];

interface ShopBrowserProps {
  items: ShopItem[];
  waitlistEntries: WaitlistEntry[];
}

export default function ShopBrowser({ items, waitlistEntries }: ShopBrowserProps) {
  const router = useRouter();
  const params = useSearchParams();
  const initial = (params.get("tab") as TabKey | null) ?? "all";
  const [active, setActive] = useState<{ title: TabKey }>(
    TABS.find((t) => t.title === initial) ?? TABS[0],
  );

  const filtered = useMemo(() => {
    if (active.title === "all") return items;
    if (active.title === "custom") return items;
    if (active.title === "tokens") {
      return items.filter(
        (i) => i.category === "tokens" || i.category === "custom",
      );
    }
    return items.filter((i) => i.category === active.title);
  }, [items, active]);

  const onChange = (tab: { title: string }) => {
    const next = TABS.find((t) => t.title === tab.title) ?? TABS[0];
    setActive(next);
    const sp = new URLSearchParams(params.toString());
    if (next.title === "all") {
      sp.delete("tab");
    } else {
      sp.set("tab", next.title);
    }
    const qs = sp.toString();
    router.replace(qs ? `/shop?${qs}` : "/shop", { scroll: false });
  };

  return (
    <ShopShell
      items={items}
      title="rosies shop"
      tabs={TABS}
      activeTab={active}
      setActiveTab={onChange}
      backHref="/"
      backIcon="home"
    >
      {active.title === "custom" ? (
        <>
          <div className="lg:hidden flex-1 min-h-0 w-full flex">
            <WaitlistContent entries={waitlistEntries} />
          </div>
          <div className="hidden lg:flex flex-1 min-h-0 w-full">
            <ShopSection items={items} />
          </div>
        </>
      ) : (
        <ShopSection items={filtered} />
      )}
    </ShopShell>
  );
}
