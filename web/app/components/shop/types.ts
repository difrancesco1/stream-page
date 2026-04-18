export type ShopItem = {
  id: string;
  category: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  quantity: number;
  image_url: string | null;
  is_active: boolean;
};
