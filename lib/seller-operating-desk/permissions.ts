import type { UserRole } from "@prisma/client";

export class SellerOperatingDeskForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "SellerOperatingDeskForbiddenError";
  }
}

export function assertSellerOperatingDeskAccess(input: {
  role: UserRole | string;
  sellerProfileId: string | null | undefined;
}): asserts input is { role: UserRole | string; sellerProfileId: string } {
  if (input.role === "ADMIN") return;
  if (!input.sellerProfileId) {
    throw new SellerOperatingDeskForbiddenError(
      "Operating desk requires seller profile",
    );
  }
}
