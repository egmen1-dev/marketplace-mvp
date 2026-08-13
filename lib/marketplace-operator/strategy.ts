import type { GrowthStrategy, MarketplaceDiagnosis } from "./types";

/** Generate multi-week growth strategy from top diagnoses. */
export function generateGrowthStrategy(
  diagnoses: MarketplaceDiagnosis[],
): GrowthStrategy[] {
  const strategies: GrowthStrategy[] = [];
  const focus = diagnoses.filter((d) => d.severity !== "LOW").slice(0, 4);

  for (const [index, diagnosis] of focus.entries()) {
    const categoryLabel =
      diagnosis.categoryName ?? diagnosis.issue.split(" ").slice(-1)[0] ?? "категории";

    const goal =
      diagnosis.category === "Supply" || diagnosis.category === "Demand"
        ? `Увеличить продажи категории ${categoryLabel}`
        : diagnosis.category === "Conversion"
          ? `Повысить конверсию: ${diagnosis.issue}`
          : `Устранить проблему: ${diagnosis.issue.slice(0, 60)}`;

    strategies.push({
      id: `strategy-${index}`,
      goal,
      category: diagnosis.categoryName,
      weeks: [
        {
          week: 1,
          label: "Week 1",
          tasks: [
            "привлечь продавцов категории",
            "улучшить 50 карточек",
            ...(diagnosis.category === "Seller activity"
              ? ["связаться с at-risk продавцами"]
              : []),
          ],
        },
        {
          week: 2,
          label: "Week 2",
          tasks: [
            "запустить promotion opportunities",
            "проверить seller trust в категории",
          ],
        },
        {
          week: 3,
          label: "Week 3",
          tasks: ["проверить конверсию", "собрать feedback покупателей"],
        },
        {
          week: 4,
          label: "Week 4",
          tasks: ["масштабировать успешные SKU", "обновить операторский план"],
        },
      ],
    });
  }

  return strategies.slice(0, 4);
}
