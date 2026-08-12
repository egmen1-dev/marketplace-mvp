/**
 * Conflict priority for taxonomy import (never hard-delete with products).
 *
 * 1. locallyEdited=true
 * 2. Admin / existing products
 * 3. Existing Catalog Core row
 * 4. WB source
 * 5. Snapshot
 */

export type ConflictDecision =
  | "allow_update"
  | "skip_local_edit"
  | "review_products"
  | "prefer_existing"
  | "allow_create";

export function sourceRank(source: string | null | undefined): number {
  const s = (source ?? "").toLowerCase();
  if (s === "wildberries" || s === "wb") return 4;
  if (s === "snapshot") return 5;
  if (s === "manual") return 2;
  if (s === "admin") return 2;
  return 3;
}

/** Lower number = higher priority (wins). */
export function conflictPriority(input: {
  locallyEdited?: boolean;
  productCount?: number;
  existingSource?: string | null;
  incomingSource?: string | null;
}): { priority: number; decision: ConflictDecision; reason: string } {
  if (input.locallyEdited) {
    return {
      priority: 1,
      decision: "skip_local_edit",
      reason: "locallyEdited — keep admin name/slug",
    };
  }
  if ((input.productCount ?? 0) > 0) {
    // Updates to meta OK; structural deletes/merges need review
    return {
      priority: 2,
      decision: "review_products",
      reason: "existing products — review structural changes",
    };
  }

  const existing = sourceRank(input.existingSource);
  const incoming = sourceRank(input.incomingSource);
  // Lower rank number from conflictPriority scale: admin/local already handled.
  // Prefer existing Catalog Core over lower-priority incoming when equal meta.
  if (existing < incoming) {
    return {
      priority: 3,
      decision: "prefer_existing",
      reason: `existing source (${input.existingSource}) outranks incoming (${input.incomingSource})`,
    };
  }

  return {
    priority: 4,
    decision: "allow_update",
    reason: "incoming may update Catalog Core row",
  };
}

export function canSoftDeactivate(input: {
  productCount: number;
  locallyEdited?: boolean;
}): { ok: boolean; reason: string } {
  if (input.productCount > 0) {
    return {
      ok: false,
      reason: "never deactivate entity with products — merge or review",
    };
  }
  if (input.locallyEdited) {
    return { ok: false, reason: "locallyEdited — require admin review" };
  }
  return { ok: true, reason: "safe soft deactivate candidate" };
}
