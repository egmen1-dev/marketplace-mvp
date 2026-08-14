import type { UserRole } from "@prisma/client";

export class SellerBusinessIntelligenceForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "SellerBusinessIntelligenceForbiddenError";
  }
}

export function assertSellerBusinessIntelligenceAccess(input: {
  role: UserRole | string;
  sellerProfileId: string | null | undefined;
}): asserts input is { role: UserRole | string; sellerProfileId: string } {
  if (input.role === "ADMIN") return;
  if (!input.sellerProfileId) {
    throw new SellerBusinessIntelligenceForbiddenError(
      "Seller business intelligence requires seller profile",
    );
  }
}
