import type {
  ActionPlanItem,
  ActionPlanType,
  GrowthStrategy,
  MarketplaceActionPlan,
  MarketplaceDiagnosis,
  Priority,
} from "./types";
import { calculateImpactScore } from "./impact";

function actionsForDiagnosis(
  diagnosis: MarketplaceDiagnosis,
): ActionPlanItem[] {
  const actions: ActionPlanItem[] = [];

  const push = (type: ActionPlanType, description: string) => {
    actions.push({ type, description });
  };

  if (diagnosis.category === "Supply" || diagnosis.category === "Demand") {
    push("SELLER_OUTREACH", "Пригласить продавцов в категорию");
    push("CATEGORY_EXPANSION", "Расширить ассортимент под спрос");
  }
  if (
    diagnosis.causes.some((c) => c.includes("карточ")) ||
    diagnosis.category === "Conversion"
  ) {
    push("PRODUCT_IMPROVEMENT", "Исправить карточки проблемных товаров");
  }
  if (diagnosis.causes.some((c) => c.includes("продвиж"))) {
    push("PROMOTION_LAUNCH", "Коммуникация о promotion opportunities");
  }
  if (diagnosis.category === "Conversion") {
    push("CONVERSION_FIX", "Провести аудит воронки категории");
  }
  if (diagnosis.causes.some((c) => c.includes("trust"))) {
    push("TRUST_BUILDING", "Усилить доверие к продавцам категории");
  }

  if (actions.length === 0) {
    push("PRODUCT_IMPROVEMENT", "Провести ручной аудит категории");
  }

  return actions.slice(0, 4);
}

function priorityFromSeverity(severity: MarketplaceDiagnosis["severity"]): Priority {
  if (severity === "HIGH") return "HIGH";
  if (severity === "MEDIUM") return "MEDIUM";
  return "LOW";
}

/** Build executable action plans from strategies and diagnoses. */
export function buildMarketplaceActionPlans(input: {
  diagnoses: MarketplaceDiagnosis[];
  strategies: GrowthStrategy[];
}): MarketplaceActionPlan[] {
  const plans: MarketplaceActionPlan[] = [];

  for (const [index, diagnosis] of input.diagnoses
    .filter((d) => d.severity !== "LOW")
    .slice(0, 6)
    .entries()) {
    const strategy = input.strategies.find(
      (s) => s.category === diagnosis.categoryName,
    );
    const actions = actionsForDiagnosis(diagnosis);
    const impact = calculateImpactScore({
      diagnosis,
      actionCount: actions.length,
    });

    plans.push({
      id: `plan-${index}`,
      title:
        strategy?.goal ??
        (diagnosis.categoryName
          ? `Улучшить категорию ${diagnosis.categoryName}`
          : diagnosis.issue.slice(0, 80)),
      priority: priorityFromSeverity(diagnosis.severity),
      actions,
      impactScore: impact.impactScore,
      expectedEffect: impact.expectedEffect,
      diagnosisId: diagnosis.id,
    });
  }

  return plans;
}
