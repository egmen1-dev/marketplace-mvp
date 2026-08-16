import type { GraphNodeKind } from "./types";

export function formatSellerGraphExplanation(input: {
  primaryCause: string;
  targetOutcome?: string;
  confidence: number;
  kind?: GraphNodeKind;
}): string {
  const outcome = input.targetOutcome ?? "продажи";
  const tentative = input.confidence < 0.55;

  if (input.kind === "photo" || input.primaryCause.toLowerCase().includes("фото")) {
    return tentative
      ? `Есть признаки, что главное фото может снижать переходы в карточку, а это ограничивает ${outcome}.`
      : `Главное фото снижает количество переходов в карточку, а это ограничивает ${outcome}.`;
  }

  if (input.primaryCause.toLowerCase().includes("ctr")) {
    return tentative
      ? `Есть признаки, что низкий CTR может ограничивать ${outcome}.`
      : `Низкий CTR ограничивает ${outcome}.`;
  }

  return tentative
    ? `Есть признаки, что «${input.primaryCause}» может влиять на ${outcome}.`
    : `«${input.primaryCause}» влияет на ${outcome}.`;
}
