import type {
  MarketplaceProblem,
  MarketplaceSignal,
} from "@/lib/marketplace-intelligence/types";

import type { DiagnosisCategory, MarketplaceDiagnosis, Severity } from "./types";

function mapSignalToCategory(signal: MarketplaceSignal): DiagnosisCategory {
  switch (signal.type) {
    case "BUYER_DEMAND":
      return "Demand";
    case "PRODUCT_GAP":
    case "CATEGORY_TREND":
      return "Supply";
    case "REVENUE_OPPORTUNITY":
      return signal.source.includes("funnel") ? "Conversion" : "Revenue";
    case "SELLER_GROWTH":
      return "Seller activity";
    case "PROMOTION_OPPORTUNITY":
      return "Revenue";
    default:
      return "Buyer experience";
  }
}

function inferCauses(signal: MarketplaceSignal): string[] {
  const causes: string[] = [];
  if (signal.type === "PRODUCT_GAP") {
    causes.push("мало качественных карточек", "низкое предложение в категории");
  }
  if (signal.type === "BUYER_DEMAND") {
    causes.push("растущий спрос покупателей");
  }
  if (signal.source === "conversion.views_no_sales") {
    causes.push("слабая конверсия карточек", "возможно низкий seller trust");
  }
  if (signal.source === "product_quality.completeness") {
    causes.push("мало качественных карточек");
  }
  if (signal.source === "analytics.funnel") {
    causes.push("низкая конверсия в корзину");
  }
  if (signal.type === "PROMOTION_OPPORTUNITY") {
    causes.push("нет продвижения", "неиспользованный потенциал promotion");
  }
  if (signal.source === "seller_growth.at_risk") {
    causes.push("низкая активность продавцов");
  }
  if (causes.length === 0) {
    causes.push("требуется ручная проверка оператором");
  }
  return [...new Set(causes)].slice(0, 4);
}

function problemToDiagnosis(
  problem: MarketplaceProblem,
  index: number,
): MarketplaceDiagnosis {
  return {
    id: `diag-prob-${index}`,
    issue: problem.title,
    category: problem.detail.includes("конверс")
      ? "Conversion"
      : problem.detail.includes("продав")
        ? "Seller activity"
        : "Revenue",
    severity: problem.severity,
    causes: [problem.detail],
    impact: "потенциальная потеря продаж",
    categoryName: null,
  };
}

/** Diagnosis engine — turns intelligence signals into structured issues. */
export function generateMarketplaceDiagnosis(input: {
  signals: MarketplaceSignal[];
  problems: MarketplaceProblem[];
}): MarketplaceDiagnosis[] {
  const diagnoses: MarketplaceDiagnosis[] = [];
  let seq = 0;

  const significant = input.signals.filter(
    (s) => s.severity === "HIGH" || s.severity === "MEDIUM",
  );

  for (const signal of significant.slice(0, 10)) {
    const category = mapSignalToCategory(signal);
    let issue = signal.message;
    if (signal.category && signal.type === "PRODUCT_GAP") {
      issue = `Низкая конверсия в категории ${signal.category}`;
    } else if (signal.category && signal.type === "CATEGORY_TREND") {
      issue = `Рост спроса в категории ${signal.category} без достаточного предложения`;
    }

    diagnoses.push({
      id: `diag-${seq++}`,
      issue,
      category,
      severity: signal.severity as Severity,
      causes: inferCauses(signal),
      impact:
        signal.type === "REVENUE_OPPORTUNITY"
          ? "потенциальная потеря выручки"
          : "потенциальная потеря продаж",
      categoryName: signal.category,
    });
  }

  for (const [i, problem] of input.problems.entries()) {
    if (diagnoses.some((d) => d.issue === problem.title)) continue;
    diagnoses.push(problemToDiagnosis(problem, i));
  }

  return diagnoses
    .sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 12);
}
