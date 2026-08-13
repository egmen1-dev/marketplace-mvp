import type { ModerationIssue } from "../reviews/types";

/** Advisory-only AI moderation copy — no automatic enforcement. */
export function buildAiModerationAdvice(input: {
  issues: ModerationIssue[];
  productName: string;
}): { headline: string; bullets: string[]; recommendation: string } {
  const errors = input.issues.filter((i) => i.severity === "error");
  const warnings = input.issues.filter((i) => i.severity === "warning");

  if (errors.length > 0) {
    return {
      headline: `Товар «${input.productName}» требует исправлений перед публикацией`,
      bullets: errors.map((e) => `❌ ${e.message}`),
      recommendation:
        errors[0]?.recommendation ??
        "Исправьте критические проблемы и отправьте снова",
    };
  }

  return {
    headline: "AI рекомендует улучшить карточку перед продвижением",
    bullets: warnings.slice(0, 3).map((w) => `⚠️ ${w.message}`),
    recommendation:
      warnings[0]?.recommendation ?? "Добавьте фото и характеристики",
  };
}
