import type { UserRole } from "@prisma/client";

export class MarketplaceTrustLoopForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "MarketplaceTrustLoopForbiddenError";
  }
}

export function assertAdminTrustAccess(role: UserRole | string): void {
  if (role !== "ADMIN") {
    throw new MarketplaceTrustLoopForbiddenError("Admin access required");
  }
}
