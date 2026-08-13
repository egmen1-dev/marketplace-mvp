import type { UserRole } from "@prisma/client";

export class SellerPromotionCenterForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "SellerPromotionCenterForbiddenError";
  }
}

export function assertSellerPromotionCenterAccess(input: {
  role: UserRole | string;
  sellerProfileId: string | null | undefined;
}): void {
  if (input.role === "ADMIN") return;
  if (!input.sellerProfileId) {
    throw new SellerPromotionCenterForbiddenError(
      "Promotion center requires seller profile",
    );
  }
}

export function assertAdminPromotionControlAccess(role: UserRole | string): void {
  if (role !== "ADMIN") {
    throw new SellerPromotionCenterForbiddenError(
      "Admin promotion control requires ADMIN role",
    );
  }
}
