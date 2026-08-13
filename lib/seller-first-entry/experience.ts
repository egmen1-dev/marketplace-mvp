import { prisma } from "@/lib/prisma";

import type { SellerExperienceProgressDto, SellerFirstEntryStep } from "./types";

function mapExperience(row: {
  sellerId: string;
  startedAt: Date;
  completedAt: Date | null;
  dismissedAt: Date | null;
  currentStep: string | null;
}): SellerExperienceProgressDto {
  return {
    sellerId: row.sellerId,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    dismissedAt: row.dismissedAt?.toISOString() ?? null,
    currentStep: (row.currentStep as SellerFirstEntryStep | null) ?? null,
  };
}

export async function getSellerExperienceProgress(
  sellerId: string,
): Promise<SellerExperienceProgressDto | null> {
  const row = await prisma.sellerExperienceProgress.findUnique({
    where: { sellerId },
  });
  return row ? mapExperience(row) : null;
}

export async function ensureExperienceStarted(
  sellerId: string,
  currentStep: SellerFirstEntryStep,
): Promise<SellerExperienceProgressDto> {
  const row = await prisma.sellerExperienceProgress.upsert({
    where: { sellerId },
    create: { sellerId, currentStep },
    update: { currentStep },
  });
  return mapExperience(row);
}

export async function markExperienceCompleted(
  sellerId: string,
): Promise<SellerExperienceProgressDto> {
  const row = await prisma.sellerExperienceProgress.upsert({
    where: { sellerId },
    create: {
      sellerId,
      completedAt: new Date(),
      currentStep: "FIRST_PAYOUT",
    },
    update: {
      completedAt: new Date(),
      currentStep: "FIRST_PAYOUT",
    },
  });
  return mapExperience(row);
}

export async function dismissWelcomeScreen(
  sellerId: string,
): Promise<SellerExperienceProgressDto> {
  const row = await prisma.sellerExperienceProgress.upsert({
    where: { sellerId },
    create: { sellerId, dismissedAt: new Date() },
    update: { dismissedAt: new Date() },
  });
  return mapExperience(row);
}

export async function syncExperienceStep(
  sellerId: string,
  currentStep: SellerFirstEntryStep,
): Promise<void> {
  await prisma.sellerExperienceProgress.upsert({
    where: { sellerId },
    create: { sellerId, currentStep },
    update: { currentStep },
  });
}
