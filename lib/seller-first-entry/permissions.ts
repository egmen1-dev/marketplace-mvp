import type { UserRole } from "@prisma/client";

export class SellerFirstEntryForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "SellerFirstEntryForbiddenError";
  }
}

export function assertSellerFirstEntryAccess(input: {
  role: UserRole | string;
  sellerProfileId: string | null | undefined;
}): asserts input is { role: UserRole | string; sellerProfileId: string } {
  if (input.role === "ADMIN") return;
  if (!input.sellerProfileId) {
    throw new SellerFirstEntryForbiddenError("Seller first entry requires seller profile");
  }
}
