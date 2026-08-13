import type { UserRole } from "@prisma/client";

export class MarketplaceLearningForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "MarketplaceLearningForbiddenError";
  }
}

export function assertMarketplaceLearningAdminAccess(role: UserRole | string): void {
  if (role !== "ADMIN") {
    throw new MarketplaceLearningForbiddenError(
      "Admin learning center requires ADMIN role",
    );
  }
}
