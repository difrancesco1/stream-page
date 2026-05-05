"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import type { ProductCategory } from "@/app/api/shop/actions";

import ShopShell from "./shop-modal";
import ShopSection from "./shop-section";
import type { ShopItem } from "./types";

type TabKey = "all" | ProductCategory;

const TABS: { title: TabKey }[] = [
  { title: "all" },
  { title: "tokens" },
  { title: "stickers" },
  { title: "etc" },
];

interface ShopBrowserProps {
  items: ShopItem[];
}

export default function ShopBrowser({ items }: ShopBrowserProps) {
  const router = useRouter();
  const params = useSearchParams();
  const initial = (params.get("tab") as TabKey | null) ?? "all";
  const [active, setActive] = useState<{ title: TabKey }>(
    TABS.find((t) => t.title === initial) ?? TABS[0],
  );

  const filtered = useMemo(
    () =>
      active.title === "all"
        ? items
        : items.filter((i) => i.category === active.title),
    [items, active],
  );

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
      backIcon="home"
    >
      <ShopSection items={filtered} />
    </ShopShell>
  );
}
