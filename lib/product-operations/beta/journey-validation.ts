import { prisma } from "@/lib/prisma";

import { isEligibleReleaseMetric } from "./evidence-eligibility";
import { BUYER_JOURNEY_STEPS, SELLER_JOURNEY_STEPS } from "./types";
import type { JourneyStepResult, JourneyValidationResult } from "./types";

const MIN_JOURNEY_SAMPLE = 3;

async function validateJourney(
  journey: "buyer" | "seller",
  steps: readonly string[],
  days = 7,
): Promise<JourneyValidationResult> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sessionSteps = await prisma.productSessionStep.findMany({
    where: { createdAt: { gte: since } },
    select: { sessionId: true, screen: true, action: true, metadata: true, createdAt: true },
    take: 10000,
  });

  const eligibleSteps = sessionSteps.filter((step) =>
    isEligibleReleaseMetric({
      createdAt: step.createdAt,
      screen: step.screen,
      sessionId: step.sessionId,
      metadata: step.metadata,
    }),
  );

  const sessionsById = new Map<string, Set<string>>();
  const errorSessions = new Map<string, number>();
  const timingByScreen = new Map<string, number[]>();

  for (const step of eligibleSteps) {
    const screens = sessionsById.get(step.sessionId) ?? new Set();
    screens.add(step.screen);
    sessionsById.set(step.sessionId, screens);

    if (step.action === "error" || step.action === "crash") {
      errorSessions.set(step.sessionId, (errorSessions.get(step.sessionId) ?? 0) + 1);
    }

    const meta = (step.metadata as { durationMs?: number }) ?? {};
    if (meta.durationMs) {
      const list = timingByScreen.get(step.screen) ?? [];
      list.push(meta.durationMs);
      timingByScreen.set(step.screen, list);
    }
  }

  const totalSessions = sessionsById.size;
  if (totalSessions < MIN_JOURNEY_SAMPLE) {
    return {
      journey,
      status: "INSUFFICIENT_DATA",
      steps: steps.map((step) => ({
        step,
        status: "PASS",
        sessions: 0,
        errors: 0,
        dropPoint: false,
        avgTimeMs: null,
      })),
      totalSessions,
      completedSessions: 0,
      completionRate: null,
    };
  }

  const stepResults: JourneyStepResult[] = steps.map((step, index) => {
    const sessionsWithStep = [...sessionsById.entries()].filter(([, screens]) => screens.has(step));
    const sessions = sessionsWithStep.length;
    const errors = sessionsWithStep.filter(([id]) => (errorSessions.get(id) ?? 0) > 0).length;
    const prevSessions =
      index > 0
        ? [...sessionsById.entries()].filter(([, screens]) => screens.has(steps[index - 1])).length
        : totalSessions;
    const dropPoint = index > 0 && sessions < prevSessions * 0.5 && prevSessions > 2;
    const timings = timingByScreen.get(step) ?? [];
    const avgTimeMs =
      timings.length > 0 ? Math.round(timings.reduce((s, v) => s + v, 0) / timings.length) : null;

    const status: JourneyStepResult["status"] =
      sessions === 0 && index > 0 ? "FAIL" : errors > sessions * 0.3 ? "FAIL" : "PASS";

    return { step, status, sessions, errors, dropPoint, avgTimeMs };
  });

  const completedSessions = [...sessionsById.entries()].filter(([, screens]) =>
    steps.every((s) => screens.has(s)),
  ).length;
  const completionRate = Math.round((completedSessions / totalSessions) * 1000) / 10;
  const failedSteps = stepResults.filter((s) => s.status === "FAIL").length;

  return {
    journey,
    status: failedSteps === 0 && completionRate >= 10 ? "PASS" : completionRate < 5 ? "FAIL" : "PASS",
    steps: stepResults,
    totalSessions,
    completedSessions,
    completionRate,
  };
}

export async function validateBuyerJourney(days = 7): Promise<JourneyValidationResult> {
  return validateJourney("buyer", BUYER_JOURNEY_STEPS, days);
}

export async function validateSellerJourney(days = 7): Promise<JourneyValidationResult> {
  return validateJourney("seller", SELLER_JOURNEY_STEPS, days);
}

export async function validateAllJourneys(days = 7): Promise<{
  buyer: JourneyValidationResult;
  seller: JourneyValidationResult;
}> {
  const [buyer, seller] = await Promise.all([
    validateBuyerJourney(days),
    validateSellerJourney(days),
  ]);
  return { buyer, seller };
}
