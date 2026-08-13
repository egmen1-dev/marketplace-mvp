import type {
  AuditAreaResult,
  FoundationRecommendation,
  LaunchChecklistItem,
  CriticalIssue,
} from "./types";

export function buildFoundationRecommendations(
  areas: AuditAreaResult[],
): FoundationRecommendation[] {
  const recommendations: FoundationRecommendation[] = [];
  const failed = areas.flatMap((a) =>
    a.checks.filter((c) => !c.passed).map((c) => ({ area: a.area, check: c })),
  );

  for (const { area, check } of failed) {
    if (check.id === "review-model" || check.id === "review-post-order-ui") {
      recommendations.push({
        id: "rec-reviews",
        problem: "Отзывы не формируют доверие покупателей",
        cause: "Review model и UI отсутствуют — только eligibility hook",
        recommendation: "Запустить MVP отзывов после COMPLETED заказа",
        severity: "critical",
      });
      break;
    }

    if (check.id === "payment-stripe-configured") {
      recommendations.push({
        id: "rec-stripe",
        problem: "Оплата недоступна в production",
        cause: "STRIPE_SECRET_KEY не настроен",
        recommendation: "Настроить Stripe keys и webhook до запуска трафика",
        severity: "critical",
      });
    }

    if (check.id === "seller-onboarding" && area === "seller") {
      recommendations.push({
        id: "rec-seller-onboarding",
        problem: "У продавцов нет первой продажи",
        cause: "Без guided onboarding продавцы бросают карточку на полпути",
        recommendation: "Включить SELLER_FIRST_ENTRY_ENABLED и seller journey",
        severity: "warning",
      });
    }

    if (check.id === "delivery-cdek-configured") {
      recommendations.push({
        id: "rec-delivery",
        problem: "Доставка работает на mock-провайдере",
        cause: "CDEK credentials не настроены",
        recommendation: "Подключить CDEK для production fulfillment",
        severity: "warning",
      });
    }

    if (check.id === "moderation-status-enum") {
      recommendations.push({
        id: "rec-moderation-queue",
        problem: "Нет очереди модерации до публикации",
        cause: "Товары публикуются без PENDING/APPROVED workflow",
        recommendation: "Добавить pre-publish moderation queue",
        severity: "warning",
      });
    }
  }

  const seen = new Set<string>();
  return recommendations.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

export function buildLaunchChecklist(
  areas: AuditAreaResult[],
): LaunchChecklistItem[] {
  const areaScore = (area: string) =>
    areas.find((a) => a.area === area)?.score ?? 0;

  return [
    {
      id: "buyer",
      label: "Buyer flow",
      ready: areaScore("buyer") >= 80,
    },
    {
      id: "seller",
      label: "Seller flow",
      ready: areaScore("seller") >= 70,
    },
    {
      id: "payments",
      label: "Payments",
      ready: areaScore("payment") >= 80,
    },
    {
      id: "reviews",
      label: "Reviews",
      ready: areaScore("review") >= 50,
      detail: "Review MVP not shipped",
    },
    {
      id: "moderation",
      label: "Moderation",
      ready: areaScore("moderation") >= 60,
    },
    {
      id: "delivery",
      label: "Delivery",
      ready: areaScore("delivery") >= 70,
    },
  ];
}

export function buildCriticalIssues(
  areas: AuditAreaResult[],
): CriticalIssue[] {
  const issues: CriticalIssue[] = [];

  for (const area of areas) {
    for (const check of area.checks) {
      if (check.passed || check.severity !== "critical") continue;
      issues.push({
        id: check.id,
        title: check.label,
        severity: check.severity,
      });
    }
  }

  return issues;
}
