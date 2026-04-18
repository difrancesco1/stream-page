import Image from "next/image";

import ShopModal from "./shop-modal";
import type { ShopItem } from "./types";

interface ShopContainerProps {
  items: ShopItem[];
  children?: React.ReactNode;
}

export default function ShopContainer({ items, children }: ShopContainerProps) {
  return (
    <div className="w-full h-full bg-card p-[0.125rem] rounded-lg shadow-md relative flex items-center justify-center py-2">
      <Image
        src="/background.gif"
        alt="Background image"
        fill
        className="object-cover pixel-borders"
        quality={0}
        priority
      />
      {children}
      <ShopModal items={items} />
    </div>
  );
}
