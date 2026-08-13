import type { ModerationIssue } from "../reviews/types";

export function analyzeProductPhotos(input: {
  imageCount: number;
  hasPrimary: boolean;
}): { score: number; issues: ModerationIssue[] } {
  const issues: ModerationIssue[] = [];
  let score = 100;

  if (input.imageCount === 0) {
    issues.push({
      id: "no-photos",
      severity: "error",
      message: "Нет фотографий товара",
      recommendation: "Добавьте главное фото крупным планом",
    });
    score -= 50;
  } else if (!input.hasPrimary) {
    issues.push({
      id: "no-primary",
      severity: "warning",
      message: "Не выбрано главное фото",
      recommendation: "Отметьте первое фото как главное",
    });
    score -= 15;
  }

  if (input.imageCount === 1) {
    issues.push({
      id: "single-photo",
      severity: "warning",
      message: "Только одно фото",
      recommendation: "Добавьте фото с разных ракурсов",
    });
    score -= 10;
  }

  return { score: Math.max(0, score), issues };
}
