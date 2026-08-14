import { getProductCompletenessMap } from "@/lib/conversion";

import type { ModerationIssue } from "../reviews/types";

export async function analyzeProductContent(input: {
  productId: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  characteristicCount: number;
}): Promise<{ score: number; issues: ModerationIssue[] }> {
  const issues: ModerationIssue[] = [];
  const qualityMap = await getProductCompletenessMap([input.productId]);
  const quality = qualityMap.get(input.productId);
  const score = quality?.score ?? 0;

  if (input.name.trim().length < 5) {
    issues.push({
      id: "short-name",
      severity: "warning",
      message: "Слишком короткое название",
      recommendation: "Добавьте понятное название с моделью",
    });
  }

  if (!input.description || input.description.trim().length < 30) {
    issues.push({
      id: "short-description",
      severity: "warning",
      message: "Недостаточно описания",
      recommendation: "Опишите преимущества и комплектацию",
    });
  }

  if (!input.categoryId) {
    issues.push({
      id: "no-category",
      severity: "error",
      message: "Не выбрана категория",
      recommendation: "Проверьте категорию товара",
    });
  }

  if (input.characteristicCount < 3) {
    issues.push({
      id: "few-characteristics",
      severity: "warning",
      message: "Мало характеристик",
      recommendation: "Заполните ключевые характеристики",
    });
  }

  for (const imp of quality?.improvements.slice(0, 3) ?? []) {
    issues.push({
      id: `quality-${imp}`,
      severity: "info",
      message: imp,
    });
  }

  return { score, issues };
}
