import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { hashDeviceId } from "../telemetry";
import type { UserJourneyStep } from "../types";
import { JOURNEY_SCREENS, SELLER_JOURNEY_SCREENS } from "../types";

export async function recordSessionStep(input: {
  sessionId: string;
  screen: string;
  action?: string;
  deviceId?: string;
  versionCode?: number;
  metadata?: Record<string, unknown>;
}) {
  const last = await prisma.productSessionStep.findFirst({
    where: { sessionId: input.sessionId },
    orderBy: { stepOrder: "desc" },
  });

  return prisma.productSessionStep.create({
    data: {
      sessionId: input.sessionId,
      stepOrder: (last?.stepOrder ?? 0) + 1,
      screen: input.screen,
      action: input.action ?? "view",
      deviceIdHash: input.deviceId ? hashDeviceId(input.deviceId) : undefined,
      versionCode: input.versionCode,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getSessionReplay(sessionId: string) {
  return prisma.productSessionStep.findMany({
    where: { sessionId },
    orderBy: { stepOrder: "asc" },
  });
}

export async function getUserJourneyFunnel(days = 7): Promise<UserJourneyStep[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const steps = await prisma.productSessionStep.findMany({
    where: { createdAt: { gte: since } },
    select: { screen: true, sessionId: true },
  });

  const sessionFirstScreen = new Map<string, Set<string>>();
  for (const step of steps) {
    const set = sessionFirstScreen.get(step.screen) ?? new Set();
    set.add(step.sessionId);
    sessionFirstScreen.set(step.screen, set);
  }

  const ordered = JOURNEY_SCREENS.map((screen) => sessionFirstScreen.get(screen)?.size ?? 0);
  const bootCount = ordered[0] || 1;

  return JOURNEY_SCREENS.map((screen, index) => {
    const count = ordered[index] ?? 0;
    const prev = index > 0 ? (ordered[index - 1] || 1) : bootCount;
    const dropOffRate = index === 0 ? 0 : Math.round((1 - count / prev) * 1000) / 10;
    return { screen, count, dropOffRate: Math.max(0, dropOffRate) };
  });
}

function buildFunnelFromScreens(screens: readonly string[], steps: { screen: string; sessionId: string }[]) {
  const sessionFirstScreen = new Map<string, Set<string>>();
  for (const step of steps) {
    const set = sessionFirstScreen.get(step.screen) ?? new Set();
    set.add(step.sessionId);
    sessionFirstScreen.set(step.screen, set);
  }

  const ordered = screens.map((screen) => sessionFirstScreen.get(screen)?.size ?? 0);
  const anchor = ordered[0] || 1;

  return screens.map((screen, index) => {
    const count = ordered[index] ?? 0;
    const prev = index > 0 ? (ordered[index - 1] || 1) : anchor;
    const dropOffRate = index === 0 ? 0 : Math.round((1 - count / prev) * 1000) / 10;
    return { screen, count, dropOffRate: Math.max(0, dropOffRate) };
  });
}

export async function getSellerJourneyFunnel(days = 7): Promise<UserJourneyStep[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const steps = await prisma.productSessionStep.findMany({
    where: { createdAt: { gte: since }, screen: { in: [...SELLER_JOURNEY_SCREENS] } },
    select: { screen: true, sessionId: true },
  });

  return buildFunnelFromScreens(SELLER_JOURNEY_SCREENS, steps);
}
