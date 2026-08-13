import type { UserRole } from "@prisma/client";

export class TrustSafetyForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "TrustSafetyForbiddenError";
  }
}

export function assertTrustSafetyAdminAccess(role: UserRole | string): void {
  if (role !== "ADMIN") {
    throw new TrustSafetyForbiddenError("Admin trust center requires ADMIN role");
  }
}

export function assertSellerTrustCoachAccess(input: {
  role: UserRole | string;
  sellerProfileId: string | null | undefined;
}): void {
  if (input.role === "ADMIN") return;
  if (!input.sellerProfileId) {
    throw new TrustSafetyForbiddenError("Seller trust coach requires seller profile");
  }
}
