import type { UserRole } from "@prisma/client";

export class SellerOperationsForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "SellerOperationsForbiddenError";
  }
}

export function assertSellerOperationsAccess(input: {
  role: UserRole | string;
  sellerProfileId: string | null | undefined;
}): asserts input is { role: UserRole | string; sellerProfileId: string } {
  if (input.role === "ADMIN") return;
  if (!input.sellerProfileId) {
    throw new SellerOperationsForbiddenError("Seller operations requires seller profile");
  }
}
