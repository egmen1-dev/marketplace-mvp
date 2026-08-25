import { ModerationStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function appendModerationAuditEvent(input: {
  productId: string;
  moderationId: string;
  sellerId: string;
  previousStatus: ModerationStatus | null;
  newStatus: ModerationStatus;
  decision: string;
  reasonCodes: string[];
  rulesTriggered: string[];
  riskScore: number | null;
  policyVersion: string | null;
  reviewerType: "SYSTEM" | "ADMIN";
  reviewerId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.productModerationAuditEvent.create({
    data: {
      productId: input.productId,
      moderationId: input.moderationId,
      sellerId: input.sellerId,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      decision: input.decision,
      reasonCodes: input.reasonCodes,
      rulesTriggered: input.rulesTriggered,
      riskScore: input.riskScore,
      policyVersion: input.policyVersion,
      reviewerType: input.reviewerType,
      reviewerId: input.reviewerId ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}
