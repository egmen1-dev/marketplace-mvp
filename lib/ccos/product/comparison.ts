import type { BuildProductUnderstandingInput, ProductComparisonAxis, ProductIdentity } from "./types";

export function buildProductComparison(
  input: BuildProductUnderstandingInput,
  identity: ProductIdentity,
): ProductComparisonAxis[] {
  const attrs = input.attributes ?? {};
  const noise = numAttr(attrs, ["шум", "noise", "noise_level"]);
  const power = numAttr(attrs, ["мощность", "power", "watt"]);
  const price = input.price ?? null;

  return [
    {
      axis: "мощность",
      score: power,
      benchmark: identity.productType?.includes("Вентилятор") ? 45 : null,
      interpretation: power != null ? (power >= 40 ? "достаточная мощность" : "ниже типичной") : "данные не указаны",
    },
    {
      axis: "шум",
      score: noise != null ? Math.max(0, 100 - noise) : null,
      benchmark: 70,
      interpretation: noise != null ? (noise <= 35 ? "тихая модель" : "шум выше комфорта") : "данные не указаны",
    },
    {
      axis: "качество",
      score: input.photoCount != null ? Math.min(100, 40 + input.photoCount * 12) : null,
      interpretation: "оценка по полноте визуального контента (advisory)",
    },
    {
      axis: "экономичность",
      score: price != null ? (price <= 4000 ? 75 : price <= 7000 ? 55 : 40) : null,
      interpretation: "коммерческий контекст, не ranking score",
    },
    {
      axis: "безопасность",
      score: identity.conflicts.length === 0 ? 80 : 45,
      interpretation: identity.conflicts.length ? "есть identity conflict" : "явных конфликтов нет",
    },
  ];
}

function numAttr(attrs: Record<string, string | number | boolean>, keys: string[]): number | null {
  for (const key of keys) {
    const v = attrs[key];
    if (typeof v === "number") return v;
    if (typeof v === "string" && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}
