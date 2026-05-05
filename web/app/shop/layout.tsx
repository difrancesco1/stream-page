import { CartProvider } from "@/app/components/shop/cart-context";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CartProvider>{children}</CartProvider>;
}
