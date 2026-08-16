import type {
  BuildProductUnderstandingInput,
  ProductIdentity,
  ProductIdentityConflict,
  ProductIdentityEvidence,
} from "./types";
import { PRODUCT_IDENTITY_VERSION } from "./types";

const TYPE_PATTERNS: Array<{ pattern: RegExp; productType: string; subcategory: string; family: string }> = [
  { pattern: /вентилятор|fan/i, productType: "Вентилятор", subcategory: "Напольный", family: "Осевой" },
  { pattern: /пылесос|vacuum/i, productType: "Пылесос", subcategory: "Бытовой", family: "Циклонный" },
  { pattern: /дрель|drill/i, productType: "Дрель", subcategory: "Электроинструмент", family: "Ударная" },
  { pattern: /роза|букет|цвет/i, productType: "Цветы", subcategory: "Срезанные", family: "Букет" },
];

export function resolveProductIdentity(input: BuildProductUnderstandingInput): ProductIdentity {
  const text = `${input.title} ${input.description ?? ""}`.toLowerCase();
  const evidence: ProductIdentityEvidence[] = [];
  let confidence = 0.35;

  let category = input.categoryName ?? undefined;
  let subcategory: string | undefined;
  let productType = input.productTypeName ?? undefined;
  let family: string | undefined;
  const brand = input.brandName ?? undefined;
  const model = input.modelName ?? undefined;

  if (input.categoryName) {
    evidence.push({ source: "taxonomy", claim: `Категория: ${input.categoryName}`, confidence: 0.75 });
    confidence += 0.2;
  }

  for (const rule of TYPE_PATTERNS) {
    if (rule.pattern.test(text)) {
      productType = productType ?? rule.productType;
      subcategory = subcategory ?? rule.subcategory;
      family = family ?? rule.family;
      category = category ?? rule.productType;
      evidence.push({
        source: "rules",
        claim: `Определён тип: ${rule.productType} / ${rule.subcategory}`,
        confidence: 0.65,
      });
      confidence += 0.15;
      break;
    }
  }

  if (brand) {
    evidence.push({ source: "title", claim: `Бренд: ${brand}`, confidence: 0.7 });
    confidence += 0.08;
  }
  if (model) {
    evidence.push({ source: "title", claim: `Модель: ${model}`, confidence: 0.6 });
    confidence += 0.05;
  }

  const conflicts = detectIdentityConflicts(input, {
    category,
    productType,
    brand,
  });

  if (conflicts.length > 0) confidence *= 0.85;

  return {
    category,
    subcategory,
    productType,
    brand,
    model,
    family,
    confidence: Math.min(1, confidence),
    evidence,
    version: PRODUCT_IDENTITY_VERSION,
    conflicts,
  };
}

function detectIdentityConflicts(
  input: BuildProductUnderstandingInput,
  identity: Pick<ProductIdentity, "category" | "productType" | "brand">,
): ProductIdentityConflict[] {
  const conflicts: ProductIdentityConflict[] = [];
  const text = `${input.title} ${input.description ?? ""}`.toLowerCase();

  if (identity.productType?.toLowerCase().includes("вентилятор") && /чайник|kettle|чай/.test(text)) {
    conflicts.push({
      field: "productType",
      expected: "Вентилятор",
      observed: "Чайник (по тексту)",
      severity: "high",
      explanation: "Описание или заголовок противоречат Product Identity",
    });
  }

  if (identity.category && input.categoryName && identity.category !== input.categoryName) {
    conflicts.push({
      field: "category",
      expected: identity.category,
      observed: input.categoryName,
      severity: "medium",
      explanation: "Taxonomy category не совпадает с rule-based identity",
    });
  }

  return conflicts;
}
