import { Suspense } from "react";

import ShopContainer from "@/app/components/shop/shop-container";
import ShopAdminLink from "@/app/components/shop/shop-admin-link";
import ShopBrowser from "@/app/components/shop/shop-browser";
import { listProducts } from "@/app/api/shop/actions";
import type { ShopItem } from "@/app/components/shop/types";

export default async function Shop() {
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

  return (
    <div className="relative w-full h-screen bg-background p-[0.325rem] lg:p-[1.825rem] md:p-[1rem]">
      <ShopContainer>
        <Suspense fallback={null}>
          <ShopBrowser items={items} />
        </Suspense>
      </ShopContainer>
      <ShopAdminLink />
    </div>
  );
}
