export type PromotionPlanId = "STARTER" | "GROWTH" | "PRO";

export type PromotionPlan = {
  id: PromotionPlanId;
  name: string;
  price: number;
  days: number;
  description: string;
};

export const PROMOTION_PLANS: PromotionPlan[] = [
  {
    id: "STARTER",
    name: "STARTER",
    price: 990,
    days: 7,
    description: "Базовое продвижение в подборках и каталоге",
  },
  {
    id: "GROWTH",
    name: "GROWTH",
    price: 1790,
    days: 14,
    description: "Расширенная видимость и приоритет в находках",
  },
  {
    id: "PRO",
    name: "PRO",
    price: 3490,
    days: 30,
    description: "Максимальный охват и аналитика кампании",
  },
];

export function getPromotionPlan(id: PromotionPlanId): PromotionPlan | undefined {
  return PROMOTION_PLANS.find((p) => p.id === id);
}
