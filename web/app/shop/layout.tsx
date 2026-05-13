import { CartProvider } from "@/app/components/shop/cart-context";
import { CardArtCustomizationProvider } from "@/app/components/shop/card-art-customization-modal";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <CardArtCustomizationProvider>{children}</CardArtCustomizationProvider>
    </CartProvider>
  );
}
