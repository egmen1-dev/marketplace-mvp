import type { ProductDNA, ProductIdentity, ProductUseCase } from "./types";

const ENVIRONMENTS = ["Дом", "Офис", "Гараж", "Дача", "Производство", "Склад"] as const;

export function buildUseCaseIntelligence(
  identity: ProductIdentity,
  dna: ProductDNA,
): ProductUseCase[] {
  return ENVIRONMENTS.map((label) => {
    const id = label.toLowerCase();
    const inDna = dna.useCases.some((u) => label.toLowerCase().includes(u) || u.includes(id));
    let fitScore = inDna ? 0.75 : 0.35;
    let recommendation: string | undefined;

    if (identity.productType?.includes("Вентилятор")) {
      if (label === "Офис" && !inDna) {
        fitScore = 0.45;
        recommendation = "Для офиса лучше выбрать более тихую модель с несколькими скоростями";
      } else if (label === "Офис" && inDna) {
        fitScore = 0.82;
        recommendation = "Подходит для офиса при низком уровне шума";
      } else if (label === "Склад" || label === "Производство") {
        fitScore = 0.4;
        recommendation = "Для больших помещений может потребоваться промышленная модель";
      }
    }

    return {
      id,
      label,
      fitScore,
      recommendation,
      confidence: identity.confidence * 0.9,
    };
  });
}
