import { loadProductInput } from "@/lib/marketplace-ranking-intelligence/queries";
import type { ObservationPublisher } from "@/lib/ccos/observation/types";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";

import { buildObservation } from "./_helpers";

const BEHAVIOUR_PUBLISHER_VERSION = "behaviour-v1";

export const behaviourPublisher: ObservationPublisher = {
  name: "marketplace-behaviour",
  async publish(context) {
    if (context.entity.type !== "product") return [];

    const input = await loadProductInput(context.entity.id);
    if (!input) return [];

    const base = {
      entityType: "product" as const,
      entityId: context.entity.id,
      sourceModule: "marketplace-behaviour",
      sourceVersion: BEHAVIOUR_PUBLISHER_VERSION,
      contextRef: context.context?.id,
    };

    const observations = [];

    if (input.views > 0) {
      const ctr = input.favoritesCount / input.views;
      observations.push(
        buildObservation({
          ...base,
          metric: OBSERVATION_METRICS.behaviour.ctr,
          domain: "behaviour",
          value: ctr,
          normalizedScore: Math.min(100, ctr * 1000),
          unit: "ratio",
          confidence: input.views >= 50 ? 0.8 : 0.4,
          evidence: [`CTR ${(ctr * 100).toFixed(2)}% при ${input.views} просмотрах`],
        }),
      );
    } else {
      observations.push(
        buildObservation({
          ...base,
          metric: OBSERVATION_METRICS.behaviour.ctr,
          domain: "behaviour",
          value: null,
          confidence: 0.15,
          evidence: ["Недостаточно просмотров для CTR"],
        }),
      );
    }

    observations.push(
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.behaviour.views,
        domain: "behaviour",
        value: input.views,
        normalizedScore: input.views > 0 ? Math.min(100, Math.log10(input.views + 1) * 25) : undefined,
        unit: "count",
        confidence: 0.9,
        evidence: [`${input.views} просмотров`],
      }),
    );

    if (input.views > 0 && input.ordersCount > 0) {
      const conversion = input.ordersCount / input.views;
      observations.push(
        buildObservation({
          ...base,
          metric: OBSERVATION_METRICS.behaviour.conversion,
          domain: "behaviour",
          value: conversion,
          normalizedScore: Math.min(100, conversion * 500),
          unit: "ratio",
          confidence: input.views >= 30 ? 0.75 : 0.35,
          evidence: [`Конверсия ${(conversion * 100).toFixed(2)}%`],
        }),
      );
    }

    return observations;
  },
};
