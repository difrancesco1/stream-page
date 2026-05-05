import { notFound } from "next/navigation";

import ShopContainer from "@/app/components/shop/shop-container";
import ShopAdminLink from "@/app/components/shop/shop-admin-link";
import ShopShell from "@/app/components/shop/shop-modal";
import ProductDetailView from "@/app/components/shop/product-detail-view";
import { listProducts } from "@/app/api/shop/actions";
import type { ShopItem } from "@/app/components/shop/types";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const VALID_TABS = new Set(["all", "tokens", "stickers", "etc"]);

export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const result = await listProducts({ activeOnly: true });
  const items: ShopItem[] = result.success
    ? result.products.map((p) => ({
        id: p.id,
        category: p.category,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        quantity: p.quantity,
        media: p.media,
        is_active: p.is_active,
      }))
    : [];

  const item = items.find((p) => p.slug === slug);
  if (!item) {
    notFound();
  }

  const safeTab = tab && VALID_TABS.has(tab) ? tab : null;
  const backHref =
    safeTab && safeTab !== "all" ? `/shop?tab=${safeTab}` : "/shop";

  return (
    <div className="relative w-full h-screen bg-background p-[0.325rem] lg:p-[1.825rem] md:p-[1rem]">
      <ShopContainer>
        <ShopShell items={items} backHref={backHref} backLabel="back to shop">
          <ProductDetailView item={item} />
        </ShopShell>
      </ShopContainer>
      <ShopAdminLink />
    </div>
  );
}
