import { Suspense } from "react";

import ShopContainer from "@/app/components/shop/shop-container";
import ShopAdminLink from "@/app/components/shop/shop-admin-link";
import ShopBrowser from "@/app/components/shop/shop-browser";
import WaitlistModal from "@/app/components/shop/custom-card-updates/waitlist-modal";
import { listProducts } from "@/app/api/shop/actions";
import { listWaitlist } from "@/app/api/shop/order-actions";
import type { ShopItem } from "@/app/components/shop/types";

export default async function Shop() {
  const [result, waitlistEntries] = await Promise.all([
    listProducts({ activeOnly: true }),
    listWaitlist(),
  ]);
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
        <div className="relative z-10 flex h-full w-full items-center justify-center gap-4">
          <Suspense fallback={null}>
            <ShopBrowser items={items} waitlistEntries={waitlistEntries} />
          </Suspense>
          <div className="hidden lg:flex h-full">
            <WaitlistModal entries={waitlistEntries} />
          </div>
        </div>
      </ShopContainer>
      <ShopAdminLink />
    </div>
  );
}
