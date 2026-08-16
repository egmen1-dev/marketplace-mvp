import { prisma } from "@/lib/prisma";
import {
  buildProductTrustSnapshot,
  deriveAvailabilityScore,
  deriveDeliveryScore,
  deriveProductCardScore,
  isMarketplaceTrustScoreModelEnabled,
} from "@/lib/marketplace-trust-score";
import type { ObservationPublisher } from "@/lib/ccos/observation/types";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";

import { buildObservation } from "./_helpers";

const TRUST_PUBLISHER_VERSION = "trust-score-v1";

export const trustPublisher: ObservationPublisher = {
  name: "marketplace-trust-score",
  async publish(context) {
    if (!isMarketplaceTrustScoreModelEnabled()) return [];
    if (context.entity.type !== "product") return [];

    const product = await prisma.product.findUnique({
      where: { id: context.entity.id },
      include: {
        images: { select: { id: true, isPrimary: true } },
        characteristicValues: { select: { id: true } },
        seller: { include: { reputation: true } },
      },
    });
    if (!product) return [];

    const sellerRep = product.seller.reputation;
    const sellerScore = sellerRep?.trustScore ?? null;
    const sellerConfidence = sellerRep && sellerRep.reviewsCount > 0 ? 0.85 : 0.45;

    const deliveryScore = deriveDeliveryScore(true);

    const productTrust = buildProductTrustSnapshot({
      productCardScore: deriveProductCardScore({
        imageCount: product.images.length,
        hasPrimary: product.images.some((i) => i.isPrimary),
        characteristicCount: product.characteristicValues.length,
        descriptionLength: product.description?.length ?? 0,
      }),
      sellerTrustScore: sellerScore ?? 50,
      averageRating: Number(sellerRep?.averageRating ?? 0),
      reviewsCount: sellerRep?.reviewsCount ?? 0,
      deliveryScore,
      availabilityScore: deriveAvailabilityScore(product.stock),
    });

    const base = {
      entityType: "product" as const,
      entityId: context.entity.id,
      sourceModule: "marketplace-trust-score",
      sourceVersion: TRUST_PUBLISHER_VERSION,
      contextRef: context.context?.id,
    };

    const observations = [
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.trust.productScore,
        domain: "trust",
        value: productTrust.productScore,
        normalizedScore: productTrust.productScore,
        unit: "score",
        confidence: sellerRep && sellerRep.reviewsCount > 0 ? 0.8 : 0.5,
        evidence: [`Trust товара ${productTrust.productScore}/100`],
      }),
    ];

    if (sellerScore != null) {
      observations.push(
        buildObservation({
          ...base,
          metric: OBSERVATION_METRICS.trust.sellerScore,
          domain: "trust",
          value: sellerScore,
          normalizedScore: sellerScore,
          unit: "score",
          confidence: sellerConfidence,
          evidence: [`Trust продавца ${sellerScore}/100`],
        }),
      );
    }

    const cancellationRate = Number(sellerRep?.cancellationRate ?? 0);
    if (sellerRep) {
      observations.push(
        buildObservation({
          ...base,
          metric: OBSERVATION_METRICS.trust.shippingReliability,
          domain: "trust",
          value: deliveryScore,
          normalizedScore: deliveryScore,
          unit: "score",
          confidence: sellerRep.completedOrders > 5 ? 0.65 : 0.25,
          evidence: [`Надёжность доставки ${deliveryScore}/100`],
        }),
      );
    }

    if (sellerRep) {
      observations.push(
        buildObservation({
          ...base,
          metric: OBSERVATION_METRICS.trust.cancellationHealth,
          domain: "trust",
          value: cancellationRate,
          normalizedScore: Math.max(0, 100 - cancellationRate * 100),
          unit: "ratio",
          confidence: sellerRep.completedOrders > 5 ? 0.8 : 0.35,
          polarity: cancellationRate > 0.1 ? "negative" : "neutral",
          evidence: [`Отмены продавца ${(cancellationRate * 100).toFixed(1)}%`],
        }),
      );
    }

    if (sellerRep && sellerRep.reviewsCount > 0) {
      observations.push(
        buildObservation({
          ...base,
          metric: OBSERVATION_METRICS.trust.reviewQuality,
          domain: "trust",
          value: Number(sellerRep.averageRating),
          normalizedScore: Math.min(100, Number(sellerRep.averageRating) * 20),
          unit: "score",
          confidence: 0.75,
          evidence: [`Средний рейтинг ${Number(sellerRep.averageRating).toFixed(1)}`],
        }),
      );
    }

    return observations;
  },
};
