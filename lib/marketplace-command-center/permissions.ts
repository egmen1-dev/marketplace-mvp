import type { UserRole } from "@prisma/client";

export class MarketplaceCommandCenterForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "MarketplaceCommandCenterForbiddenError";
  }
}

export function assertCommandCenterAdminAccess(role: UserRole | string): void {
  if (role !== "ADMIN") {
    throw new MarketplaceCommandCenterForbiddenError(
      "Admin command center requires ADMIN role",
    );
  }
}

export function assertSellerCommandCenterAccess(input: {
  role: UserRole | string;
  sellerProfileId: string | null | undefined;
}): void {
  if (input.role === "ADMIN") return;
  if (!input.sellerProfileId) {
    throw new MarketplaceCommandCenterForbiddenError(
      "Seller command center requires seller profile",
    );
  }
}
