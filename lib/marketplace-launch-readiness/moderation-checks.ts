import { ModerationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { detectProhibitedProduct } from "@/lib/marketplace-trust-loop/risk/prohibited-products";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";

import { launchCheck } from "./audit";
import { isMarketplaceLaunchReadinessEnabled } from "./flags";
import type { LaunchAuditCheck } from "./types";

export function auditModerationLaunch(): LaunchAuditCheck[] {
  const trustLoop = isMarketplaceTrustLoopEnabled();

  return [
    launchCheck(
      "moderation-trust-loop",
      "Trust loop moderation enabled",
      trustLoop,
      "critical",
      trustLoop ? undefined : "Enable MARKETPLACE_TRUST_LOOP_ENABLED",
    ),
    launchCheck(
      "moderation-prohibited-rules",
      "Prohibited product rule engine",
      trustLoop && detectProhibitedProduct({ name: "оружие" }).hit,
      "warning",
      "Rule-based keyword detection",
    ),
    launchCheck(
      "moderation-photo-quality",
      "Photo quality checks",
      trustLoop,
      "info",
    ),
    launchCheck(
      "moderation-content-quality",
      "Product card quality checks",
      trustLoop,
      "info",
    ),
    launchCheck("moderation-admin-queue", "Admin moderation queue UI", trustLoop),
    launchCheck(
      "moderation-ai-advisory",
      "AI moderation is advisory only",
      true,
      "info",
      "No auto-block without human decision",
    ),
  ];
}

export async function auditModerationLive(): Promise<LaunchAuditCheck[]> {
  if (!isMarketplaceLaunchReadinessEnabled() || !isMarketplaceTrustLoopEnabled()) {
    return [];
  }

  const [pendingQueue, needsFix] = await Promise.all([
    prisma.moderationQueueItem.count({
      where: { status: ModerationStatus.PENDING_REVIEW },
    }),
    prisma.productModeration.count({
      where: { status: ModerationStatus.NEEDS_FIX },
    }),
  ]);

  return [
    launchCheck(
      "moderation-queue-active",
      "Moderation queue processing",
      true,
      pendingQueue > 50 ? "warning" : "info",
      pendingQueue > 0 ? `${pendingQueue} pending` : "Queue empty",
    ),
    launchCheck(
      "moderation-needs-fix",
      "Products awaiting seller fixes",
      needsFix < 100,
      needsFix > 0 ? "info" : "info",
      needsFix > 0 ? `${needsFix} cards need fixes` : undefined,
    ),
  ];
}
