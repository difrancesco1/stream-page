"use client";

import Link from "next/link";

import { useAuth } from "@/app/context/auth-context";

export default function ShopAdminLink() {
  const { user } = useAuth();
  const isRosie = user?.username?.toLowerCase() === "rosie";

  if (!isRosie) return null;

  return (
    <Link
      href="/shop/admin/orders/custom"
      className="absolute top-[0.75rem] right-[0.75rem] lg:top-[0.1rem] lg:right-[1.87rem]
        pixel-borders px-[var(--spacing-sm)] py-[0.1rem]
        bg-background text-[color:var(--border)]
        main-text text-[0.75rem] z-20
        hover:bg-[color:var(--accent)] hover:text-[color:var(--background)]
        transition-colors"
    >
      manage shop
    </Link>
  );
}
