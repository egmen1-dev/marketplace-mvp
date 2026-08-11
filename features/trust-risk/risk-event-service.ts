import {
  Prisma,
  RiskEventStatus,
  type PrismaClient,
  type RiskEventSource,
  type RiskEventType,
  type RiskSeverity,
} from "@prisma/client";

import { decideSignal } from "./rule-engine";

/**
 * RiskEventService (AGENT-019, sections 8/27/28/31). Records domain risk signals
 * (idempotent via sourceEventId), supports admin resolution with an audit trail,
 * and provides admin read queries. No hard delete of events.
 */

export type RecordRiskSignalInput = {
  type: RiskEventType;
  source: RiskEventSource;
  severity?: RiskSeverity;
  scoreDelta?: number;
  confidence?: number;
  reason?: string;
  /** Idempotency key for repeated domain-event delivery (section 28). */
  sourceEventId?: string;
  userId?: string | null;
  sellerId?: string | null;
  productId?: string | null;
  orderId?: string | null;
  reservationId?: string | null;
  conversationId?: string | null;
  /** Non-PII technical metadata only (section 43). */
  metadata?: Record<string, unknown>;
};

/** Idempotently record a risk signal. Returns the (new or existing) event. */
export async function recordRiskSignal(
  db: PrismaClient,
  input: RecordRiskSignalInput,
): Promise<{ id: string; created: boolean }> {
  if (input.sourceEventId) {
    const existing = await db.riskEvent.findUnique({
      where: { sourceEventId: input.sourceEventId },
      select: { id: true },
    });
    if (existing) return { id: existing.id, created: false };
  }

  const confidence = input.confidence ?? 50;
  const decision = decideSignal({
    type: input.type,
    severity: input.severity ?? "LOW",
    confidence,
  });

  const metadata = {
    ...(input.metadata ?? {}),
    effect: decision.effect,
    ruleId: decision.ruleId,
  } satisfies Record<string, unknown>;

  try {
    const created = await db.riskEvent.create({
      data: {
        type: input.type,
        source: input.source,
        severity: decision.severity,
        status: RiskEventStatus.OPEN,
        scoreDelta: Math.max(0, input.scoreDelta ?? 0),
        confidence,
        sourceEventId: input.sourceEventId ?? null,
        userId: input.userId ?? null,
        sellerId: input.sellerId ?? null,
        productId: input.productId ?? null,
        orderId: input.orderId ?? null,
        reservationId: input.reservationId ?? null,
        conversationId: input.conversationId ?? null,
        reason: input.reason ?? null,
        metadata: metadata as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    return { id: created.id, created: true };
  } catch (err) {
    // Unique race on sourceEventId → treat as idempotent hit.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      input.sourceEventId
    ) {
      const existing = await db.riskEvent.findUnique({
        where: { sourceEventId: input.sourceEventId },
        select: { id: true },
      });
      if (existing) return { id: existing.id, created: false };
    }
    throw err;
  }
}

export type ResolutionAction =
  | "reviewed"
  | "dismiss"
  | "confirm"
  | "note"
  | "escalate";

const ACTION_STATUS: Record<ResolutionAction, RiskEventStatus | null> = {
  reviewed: RiskEventStatus.UNDER_REVIEW,
  dismiss: RiskEventStatus.DISMISSED,
  confirm: RiskEventStatus.CONFIRMED,
  escalate: RiskEventStatus.UNDER_REVIEW,
  note: null,
};

/** Admin resolution with audit trail (never hard-deletes — section 31/41). */
export async function resolveRiskEvent(
  db: PrismaClient,
  input: {
    adminUserId: string;
    riskEventId: string;
    action: ResolutionAction;
    note?: string;
  },
): Promise<void> {
  const event = await db.riskEvent.findUnique({
    where: { id: input.riskEventId },
    select: { id: true },
  });
  if (!event) throw new Error("Risk event not found");

  const nextStatus = ACTION_STATUS[input.action];
  const terminal =
    input.action === "dismiss" || input.action === "confirm";

  if (nextStatus) {
    await db.riskEvent.update({
      where: { id: event.id },
      data: {
        status: nextStatus,
        ...(terminal
          ? {
              resolution: input.action,
              resolvedById: input.adminUserId,
              resolvedAt: new Date(),
            }
          : {}),
      },
    });
  }

  await db.riskAuditLog.create({
    data: {
      riskEventId: event.id,
      actorUserId: input.adminUserId,
      action: input.action,
      note: input.note ?? null,
    },
  });
}

// ─── Admin reads ─────────────────────────────────────────────────────────────

export type RiskEventFilters = {
  severity?: RiskSeverity;
  type?: RiskEventType;
  status?: RiskEventStatus;
  sellerId?: string;
  userId?: string;
  productId?: string;
  page?: number;
  pageSize?: number;
};

export async function listRiskEvents(db: PrismaClient, filters: RiskEventFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100);
  const where: Prisma.RiskEventWhereInput = {};
  if (filters.severity) where.severity = filters.severity;
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.sellerId) where.sellerId = filters.sellerId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.productId) where.productId = filters.productId;

  const [items, total] = await Promise.all([
    db.riskEvent.findMany({
      where,
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.riskEvent.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getRiskCounters(db: PrismaClient) {
  const [high, critical, underReview, open] = await Promise.all([
    db.riskEvent.count({ where: { severity: "HIGH", status: { not: "DISMISSED" } } }),
    db.riskEvent.count({ where: { severity: "CRITICAL", status: { not: "DISMISSED" } } }),
    db.riskEvent.count({ where: { status: "UNDER_REVIEW" } }),
    db.riskEvent.count({ where: { status: "OPEN" } }),
  ]);
  return { high, critical, underReview, open };
}

export async function getEntityRiskEvents(
  db: PrismaClient,
  scope: { userId?: string; sellerId?: string; productId?: string },
) {
  const where: Prisma.RiskEventWhereInput = {};
  if (scope.userId) where.userId = scope.userId;
  if (scope.sellerId) where.sellerId = scope.sellerId;
  if (scope.productId) where.productId = scope.productId;
  return db.riskEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
