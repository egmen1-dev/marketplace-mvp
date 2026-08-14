export type BuyerSegmentId =
  | "new_user"
  | "returning"
  | "active_buyer"
  | "abandoned_cart"
  | "category_buyer";

export type BuyerSegment = {
  id: BuyerSegmentId;
  label: string;
  description: string;
  recommendation: string;
};

export const BUYER_SEGMENTS: BuyerSegment[] = [
  {
    id: "new_user",
    label: "Новый пользователь",
    description: "Первый визит или нет покупок",
    recommendation: "Покажите находки и объясните безопасность покупки",
  },
  {
    id: "returning",
    label: "Возвращающийся",
    description: "Был на сайте, но ещё не купил",
    recommendation: "Персональные рекомендации и напоминание об избранном",
  },
  {
    id: "active_buyer",
    label: "Активный покупатель",
    description: "Есть завершённые заказы",
    recommendation: "Cross-sell по категориям и повторные покупки",
  },
  {
    id: "abandoned_cart",
    label: "Брошенная корзина",
    description: "Товары в корзине без оплаты",
    recommendation: "Напомнить о корзине и снять сомнения (доставка, отзывы)",
  },
  {
    id: "category_buyer",
    label: "Покупатель категории",
    description: "Интерес к одной категории",
    recommendation: "Подборки и похожие товары в категории",
  },
];

export function classifyBuyerSegment(input: {
  ordersCount: number;
  cartItemCount: number;
  productViewsCount: number;
  topCategoryName?: string | null;
  accountAgeDays: number;
}): BuyerSegment {
  if (input.cartItemCount > 0 && input.ordersCount === 0) {
    return BUYER_SEGMENTS.find((s) => s.id === "abandoned_cart")!;
  }
  if (input.ordersCount >= 2) {
    return BUYER_SEGMENTS.find((s) => s.id === "active_buyer")!;
  }
  if (input.topCategoryName && input.productViewsCount >= 3) {
    return {
      ...(BUYER_SEGMENTS.find((s) => s.id === "category_buyer")!),
      description: `Интерес к категории «${input.topCategoryName}»`,
    };
  }
  if (input.productViewsCount > 0 || input.accountAgeDays > 7) {
    return BUYER_SEGMENTS.find((s) => s.id === "returning")!;
  }
  return BUYER_SEGMENTS.find((s) => s.id === "new_user")!;
}
