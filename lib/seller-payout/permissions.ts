import type { UserRole } from "@prisma/client";

export class SellerPayoutForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "SellerPayoutForbiddenError";
  }
}

export function assertSellerPayoutAccess(input: {
  role: UserRole | string;
  sellerProfileId: string | null | undefined;
}): asserts input is { role: UserRole | string; sellerProfileId: string } {
  if (input.role === "ADMIN") return;
  if (!input.sellerProfileId) {
    throw new SellerPayoutForbiddenError("Payout requires seller profile");
  }
}

export function assertSellerOwnsPayoutResource(
  sellerProfileId: string,
  resourceSellerId: string,
): void {
  if (sellerProfileId !== resourceSellerId) {
    throw new SellerPayoutForbiddenError("Можно управлять только своими выплатами");
  }
}

export function assertAdminPayoutAccess(role: UserRole | string): void {
  if (role !== "ADMIN") {
    throw new SellerPayoutForbiddenError("Admin payout access requires ADMIN role");
  }
}
