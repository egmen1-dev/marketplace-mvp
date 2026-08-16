import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function recordAuditEvent(input: {
  action: string;
  entityKey: string;
  actorId?: string;
  payload?: Record<string, unknown>;
}) {
  return prisma.productOpsAuditEvent.create({
    data: {
      action: input.action,
      entityKey: input.entityKey,
      actorId: input.actorId,
      payload: input.payload as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function listAuditEvents(limit = 50) {
  return prisma.productOpsAuditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
