import { analyzeProductContent } from "@/lib/marketplace-trust-loop/content-quality/product-quality";
import { analyzeProductPhotos } from "@/lib/marketplace-trust-loop/content-quality/photo-analysis";

import { buildReason } from "../policies/registry";
import type { ModerationReason, ModerationSignal } from "../types";

export async function analyzeStructuralSignals(input: {
  productId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  characteristicCount: number;
  imageCount: number;
  hasPrimary: boolean;
}): Promise<{ reasons: ModerationReason[]; signals: ModerationSignal[]; qualityScore: number }> {
  const photo = analyzeProductPhotos({
    imageCount: input.imageCount,
    hasPrimary: input.hasPrimary,
  });
  const content = await analyzeProductContent({
    productId: input.productId,
    name: input.name,
    description: input.description,
    categoryId: input.categoryId,
    characteristicCount: input.characteristicCount,
  });

  const reasons: ModerationReason[] = [];
  const signals: ModerationSignal[] = [];

  if (input.imageCount === 0) {
    reasons.push(
      buildReason("MISSING_REQUIRED_INFORMATION", "MISSING_REQUIRED_INFO_V1", {
        severity: "HIGH",
        userMessage: "Добавьте хотя бы одно фото.",
        adminMessage: "No product images",
        remediation: "Загрузите фото товара.",
      }),
    );
  }

  for (const issue of [...photo.issues, ...content.issues]) {
    if (issue.severity === "error") {
      reasons.push(
        buildReason("MISSING_REQUIRED_INFORMATION", "MISSING_REQUIRED_INFO_V1", {
          severity: "HIGH",
          userMessage: issue.message,
          adminMessage: issue.message,
          remediation: issue.recommendation,
        }),
      );
      signals.push({
        id: issue.id,
        category: "STRUCTURAL",
        weight: 25,
        message: issue.message,
        ruleId: "MISSING_REQUIRED_INFO_V1",
      });
    }
  }

  const qualityScore = Math.round((photo.score + content.score) / 2);
  return { reasons, signals, qualityScore };
}
