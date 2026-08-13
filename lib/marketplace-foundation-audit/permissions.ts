import type { UserRole } from "@prisma/client";

export class MarketplaceFoundationAuditForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "MarketplaceFoundationAuditForbiddenError";
  }
}

export function assertMarketplaceFoundationAuditAccess(input: {
  role: UserRole | string;
}): void {
  if (input.role !== "ADMIN") {
    throw new MarketplaceFoundationAuditForbiddenError(
      "Foundation audit requires admin role",
    );
  }
}
