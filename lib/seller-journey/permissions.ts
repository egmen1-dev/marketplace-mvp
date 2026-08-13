import type { UserRole } from "@prisma/client";

export class SellerJourneyForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "SellerJourneyForbiddenError";
  }
}

export function assertSellerJourneyAccess(input: {
  role: UserRole | string;
  sellerProfileId: string | null | undefined;
}): asserts input is { role: UserRole | string; sellerProfileId: string } {
  if (input.role === "ADMIN") return;
  if (!input.sellerProfileId) {
    throw new SellerJourneyForbiddenError("Seller journey requires seller profile");
  }
}
