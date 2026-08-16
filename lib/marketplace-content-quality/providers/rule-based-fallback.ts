import {
  evaluateAttributesQuality,
  evaluateConsistency,
  evaluateDescriptionQuality,
  evaluateSeoQuality,
  evaluateVideoQuality,
} from "../description-quality";
import {
  evaluateBuyerValue,
  evaluateCommercialIntent,
  evaluateCompliance,
} from "../compliance-adapter";
import { computeCommercialQualityScore } from "../commercial-quality-score";
import { evaluateManipulationRisk } from "../manipulation-critic";
import { evaluatePhotoQuality } from "../photo-quality";
import { evaluateContentQualityGates } from "../quality-gates";
import type { ProductQualityEvaluation, ProductQualityInput, QualityRecommendation } from "../types";
import { CRITIC_VERSION, FALLBACK_PROVIDER_VERSION, QUALITY_MODEL_VERSION } from "../version";
import { hashContent } from "../utils";
import type { ContentQualityProvider } from "./content-quality-provider";

function pickNextAction(
  input: ProductQualityInput,
  photoBundle: ReturnType<typeof evaluatePhotoQuality>,
): QualityRecommendation | null {
  if (photoBundle.primary.score < 55) {
    const primary = photoBundle.photo.images.find((i) => i.isPrimary) ?? photoBundle.photo.images[0];
    return {
      id: "replace-primary-photo",
      title: "Замените главное фото",
      why: "Товар занимает мало кадра или плохо читается в выдаче",
      ctaLabel: "Заменить фото",
      ctaHref: `/account/products/${input.productId}/edit#photos`,
      priority: 1,
      imageIndex: primary?.index,
      imageUrl: primary?.url,
    };
  }
  if (photoBundle.relevance.irrelevant) {
    const bad = photoBundle.photo.images.find((i) => i.relevance < 30);
    return {
      id: "fix-irrelevant-photo",
      title: "Замените нерелевантные фото",
      why: bad
        ? `Image #${bad.index} не соответствует товару`
        : "Несколько фото не показывают заявленный товар",
      ctaLabel: "Исправить",
      ctaHref: `/account/products/${input.productId}/edit#photos`,
      priority: 1,
      imageIndex: bad?.index,
      imageUrl: bad?.url,
    };
  }
  return null;
}

export class RuleBasedFallbackProvider implements ContentQualityProvider {
  readonly name = "rule-based-fallback";
  readonly version = FALLBACK_PROVIDER_VERSION;

  async evaluateProduct(input: ProductQualityInput): Promise<ProductQualityEvaluation> {
    const photoBundle = evaluatePhotoQuality(input);
    const description = evaluateDescriptionQuality(input);
    const seo = evaluateSeoQuality(input);
    const attributes = evaluateAttributesQuality(input);
    const consistency = evaluateConsistency(input);
    const video = evaluateVideoQuality(input);
    const compliance = evaluateCompliance(input);
    const buyerValue = evaluateBuyerValue(input);
    const commercialIntent = evaluateCommercialIntent(input);
    const manipulation = evaluateManipulationRisk(input);

    const gates = evaluateContentQualityGates({
      photo: photoBundle,
      consistencySerious: consistency.seriousContradiction,
      complianceHardBlock: compliance.hardBlock,
      complianceStatus: compliance.complianceStatus,
      primaryPhotoScore: photoBundle.primary.score,
    });

    const factorBundle = {
      photo: {
        score: photoBundle.photo.score,
        confidence: photoBundle.photo.confidence,
        evidence: { reasons: photoBundle.photo.reasons },
        effectivePhotoCount: photoBundle.photo.effectivePhotoCount,
        uploadedPhotoCount: photoBundle.photo.uploadedPhotoCount,
      },
      thumbnail: {
        score: photoBundle.thumbnail.score,
        confidence: photoBundle.thumbnail.confidence,
        evidence: { reasons: photoBundle.thumbnail.reasons },
      },
      description: {
        score: description.score,
        confidence: description.confidence,
        evidence: { reasons: description.reasons },
      },
      seo: {
        score: seo.score,
        confidence: seo.confidence,
        evidence: { reasons: seo.reasons },
      },
      attributes: {
        score: attributes.score,
        confidence: attributes.confidence,
        evidence: { reasons: attributes.reasons },
      },
      video: {
        score: video.score,
        confidence: video.confidence,
        evidence: { reasons: video.reasons },
      },
      consistency: {
        score: consistency.score,
        confidence: consistency.confidence,
        evidence: { reasons: consistency.reasons },
      },
      commercialValue: {
        score: commercialIntent.score,
        confidence: commercialIntent.confidence,
        evidence: { reasons: commercialIntent.reasons },
      },
      compliance: {
        score: compliance.score,
        confidence: compliance.confidence,
        evidence: { reasons: compliance.reasons },
      },
      buyerValue: {
        score: buyerValue.score,
        confidence: buyerValue.confidence,
        evidence: { reasons: buyerValue.reasons },
      },
      manipulation: {
        score: manipulation.score,
        confidence: manipulation.confidence,
        evidence: { reasons: manipulation.reasons },
      },
    };

    const { overallScore, confidence } = computeCommercialQualityScore(factorBundle);

    const strengths: string[] = [];
    const warnings: string[] = [...manipulation.warnings];
    if (attributes.score >= 85) strengths.push("Характеристики заполнены");
    if (description.score >= 75) strengths.push("Описание понятное");
    if (photoBundle.photo.score >= 75) strengths.push("Фото полезны покупателю");
    if (photoBundle.relevance.irrelevant) {
      warnings.push(`${photoBundle.photo.images.filter((i) => i.relevance < 30).length} фото не соответствуют товару`);
    }
    if (photoBundle.primary.score < 50) warnings.push("Главное фото слишком слабое");
    if (video.score < 20 && input.hasVideo) warnings.push("Видео не показывает товар");

    const next = pickNextAction(input, photoBundle);
    const recommendations: QualityRecommendation[] = next ? [next] : [];

    const contentHash =
      input.contentHash ??
      hashContent([
        input.name,
        input.description ?? "",
        input.seoTitle ?? "",
        input.seoDescription ?? "",
        input.images.map((i) => i.url).join(","),
        input.characteristics.map((c) => `${c.slug}:${c.value}`).join(","),
        String(input.hasVideo),
      ]);

    return {
      productId: input.productId,
      overallScore,
      confidence,
      commercialQualityScore: overallScore,
      provider: this.name,
      providerVersion: this.version,
      qualityModelVersion: QUALITY_MODEL_VERSION,
      criticVersion: CRITIC_VERSION,
      evaluatedAt: new Date().toISOString(),
      topEligibility: gates.topEligibility,
      qualityGateFailed: gates.qualityGateFailed,
      failedGates: gates.failedGates,
      photo: {
        score: photoBundle.photo.score,
        confidence: photoBundle.photo.confidence,
        evidence: { reasons: photoBundle.photo.reasons },
        uploadedPhotoCount: photoBundle.photo.uploadedPhotoCount,
        effectivePhotoCount: photoBundle.photo.effectivePhotoCount,
        images: photoBundle.photo.images,
      },
      thumbnail: {
        score: photoBundle.thumbnail.score,
        confidence: photoBundle.thumbnail.confidence,
        evidence: { reasons: photoBundle.thumbnail.reasons },
      },
      description: {
        score: description.score,
        confidence: description.confidence,
        evidence: { reasons: description.reasons },
      },
      seo: {
        score: seo.score,
        confidence: seo.confidence,
        evidence: { reasons: seo.reasons },
      },
      attributes: {
        score: attributes.score,
        confidence: attributes.confidence,
        evidence: { reasons: attributes.reasons },
      },
      video: {
        score: video.score,
        confidence: video.confidence,
        evidence: { reasons: video.reasons },
      },
      consistency: {
        score: consistency.score,
        confidence: consistency.confidence,
        evidence: { reasons: consistency.reasons },
      },
      commercialValue: {
        score: commercialIntent.score,
        confidence: commercialIntent.confidence,
        evidence: { reasons: commercialIntent.reasons },
      },
      compliance: {
        score: compliance.score,
        confidence: compliance.confidence,
        evidence: { reasons: compliance.reasons },
        complianceStatus: compliance.complianceStatus,
      },
      manipulation: {
        score: manipulation.score,
        confidence: manipulation.confidence,
        evidence: { reasons: manipulation.reasons },
      },
      buyerValue: {
        score: buyerValue.score,
        confidence: buyerValue.confidence,
        evidence: { reasons: buyerValue.reasons },
      },
      blockers: gates.blockers,
      warnings,
      strengths,
      recommendations,
      contentHash,
      daosUsed: false,
      fallbackUsed: true,
    };
  }
}
