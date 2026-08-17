import type { SellerScreenId } from "../blueprints/types";

export type SellerJourneyStep = {
  order: number;
  screenId: SellerScreenId;
  route: string;
  question: string;
  exitActions: string[];
};

/** Full seller user journey — EPIC 86 architecture */
export const SELLER_USER_JOURNEY: SellerJourneyStep[] = [
  { order: 1, screenId: "splash", route: "index", question: "Приложение готово к работе?", exitActions: ["→ login", "→ seller_home"] },
  { order: 2, screenId: "login", route: "login", question: "Я вошёл как продавец?", exitActions: ["→ seller_home"] },
  { order: 3, screenId: "seller_home", route: "(tabs)/seller-home", question: "Что делать сегодня для заработка?", exitActions: ["→ products", "→ orders", "→ finance", "→ ai"] },
  { order: 4, screenId: "seller_products", route: "(tabs)/seller-products", question: "Какие товары приносят/теряют деньги?", exitActions: ["→ product_detail"] },
  { order: 5, screenId: "seller_product_detail", route: "product/[id]", question: "Что исправить в этом SKU?", exitActions: ["→ promotion", "→ buyer preview"] },
  { order: 6, screenId: "seller_orders", route: "(tabs)/seller-sales", question: "Какие заказы обработать сейчас?", exitActions: ["→ order detail"] },
  { order: 7, screenId: "seller_finance", route: "(tabs)/wallet", question: "Сколько я заработал и когда выплата?", exitActions: ["→ payout web"] },
  { order: 8, screenId: "seller_analytics", route: "seller/analytics", question: "Где растёт и где падает выручка?", exitActions: ["→ product_detail", "→ promotion"] },
  { order: 9, screenId: "seller_promotion", route: "seller/promotion", question: "Как увеличить показы?", exitActions: ["→ web campaign"] },
  { order: 10, screenId: "seller_ai_assistant", route: "seller/ai", question: "Что AI советует сделать?", exitActions: ["→ contextual screen"] },
  { order: 11, screenId: "profile", route: "(tabs)/profile", question: "Аккаунт и режим в порядке?", exitActions: ["→ buyer mode", "→ logout"] },
];

export const SELLER_JOURNEY_PHILOSOPHY =
  "Продавец открывает приложение не для управления товарами, а чтобы понимать: сколько заработал, что сделать сегодня, что продаётся, где теряет деньги, что делать дальше.";
