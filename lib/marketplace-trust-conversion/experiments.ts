import type { TrustExperiment, TrustExperimentFoundation } from "./types";

/** Foundation registry — not a live A/B system; documents planned trust experiments. */
export const TRUST_EXPERIMENT_REGISTRY: TrustExperiment[] = [
  {
    id: "reviews-above-trust",
    name: "Отзывы выше trust block",
    hypothesis: "Социальное доказательство раньше повышает CTR покупки",
    variant: "reviews_first",
    metric: "view_to_purchase_rate",
    beforeRate: 2.1,
    afterRate: 2.5,
    status: "draft",
  },
  {
    id: "protection-first-new-seller",
    name: "Защита покупателя первой",
    hypothesis: "Блок «Покупка защищена» снижает сомнения у новых продавцов",
    variant: "protection_first",
    metric: "view_to_cart_rate",
    beforeRate: 8.4,
    afterRate: 10.2,
    status: "running",
  },
  {
    id: "trust-explanation-expand",
    name: "Раскрываемое объяснение доверия",
    hypothesis: "Детали доверия по запросу не перегружают PDP",
    variant: "details_on_demand",
    metric: "trust_details_open_rate",
    beforeRate: 12,
    afterRate: 18,
    status: "completed",
  },
];

export function getTrustExperimentFoundation(): TrustExperimentFoundation {
  return {
    enabled: true,
    experiments: TRUST_EXPERIMENT_REGISTRY,
  };
}
