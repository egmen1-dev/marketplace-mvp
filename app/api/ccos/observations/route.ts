import { NextResponse } from "next/server";
import { z } from "zod";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { publishObservationsToBus } from "@/lib/ccos/observation/bus";
import type { UniversalObservation } from "@/lib/ccos/observation/types";

const observationSchema = z.object({
  app: z.enum(["marketplace", "daos", "quicksale", "crm", "erp", "wms"]),
  observations: z
    .array(
      z.object({
        id: z.string().optional(),
        metric: z.string(),
        domain: z.string(),
        value: z.unknown(),
        normalizedScore: z.number().nullable().optional(),
        confidence: z.number().min(0).max(1),
        entity: z.object({ type: z.string(), id: z.string() }),
        source: z.object({ module: z.string(), version: z.string() }),
        evidence: z.array(z.string()).default([]),
        observedAt: z.string().optional(),
      }),
    )
    .min(1)
    .max(50),
});

/**
 * Unified Observation API — publish observations from any product via CCOS bus.
 * POST /api/ccos/observations
 */
export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const parsed = observationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
    }

    const observations: UniversalObservation[] = parsed.data.observations.map((o, index) => ({
      id: o.id ?? `${parsed.data.app}:obs:${index}:${Date.now()}`,
      app: parsed.data.app,
      metric: o.metric,
      domain: o.domain as UniversalObservation["domain"],
      value: o.value as UniversalObservation["value"],
      normalizedScore: o.normalizedScore ?? undefined,
      confidence: o.confidence,
      polarity: "neutral",
      entity: {
        type: o.entity.type as UniversalObservation["entity"]["type"],
        id: o.entity.id,
      },
      source: o.source,
      evidence: o.evidence,
      observedAt: o.observedAt ?? new Date().toISOString(),
      tags: ["observation-bus"],
    }));

    const { recorded, errors } = publishObservationsToBus({
      app: parsed.data.app,
      observations,
    });

    return NextResponse.json({
      ok: true,
      recorded: recorded.length,
      errors,
      advisoryOnly: true,
    });
  } catch (err) {
    console.error("[ccos/observations]", err);
    return NextResponse.json({ error: "Observation publish failed" }, { status: 500 });
  }
}
