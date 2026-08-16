import type { GraphCounterfactual } from "./types";
import { findWhyPath } from "./traversal";
import { UniversalGraphEngine } from "./engine";

export function buildCounterfactual(input: {
  engine: UniversalGraphEngine;
  baselineAction: string;
  alternativeAction: string;
  question?: string;
}): GraphCounterfactual {
  const why = findWhyPath(input.engine, {
    question: input.question ?? "Почему низкие продажи?",
    weakNodeIds: actionToNodeIds(input.baselineAction),
  });

  const altNodes = actionToNodeIds(input.alternativeAction);
  const altLabel = altNodes.map((id) => input.engine.getNode(id)?.label).filter(Boolean).join(", ");

  return {
    question:
      input.question ??
      `Что было бы, если ${input.alternativeAction}, а не ${input.baselineAction}?`,
    baselineAction: input.baselineAction,
    alternativeAction: input.alternativeAction,
    predictedOutcome:
      altLabel.length > 0
        ? `Альтернатива «${input.alternativeAction}» вероятнее улучшит ${why.path.at(-1)?.label ?? "Revenue"} через ${altLabel}`
        : "Недостаточно данных для counterfactual",
    confidence: Math.min(0.85, why.confidence * 0.9),
    path: why.path,
    advisoryOnly: true,
  };
}

function actionToNodeIds(action: string): string[] {
  const a = action.toLowerCase();
  if (a.includes("фото") || a.includes("photo")) return ["node_photo"];
  if (a.includes("цен")) return ["node_price"];
  if (a.includes("видео")) return ["node_video"];
  if (a.includes("seo")) return ["node_seo"];
  if (a.includes("продвиж") || a.includes("promo")) return ["node_promotion"];
  if (a.includes("отзыв") || a.includes("review")) return ["node_review"];
  return ["node_photo"];
}
