import type { UserRole } from "@prisma/client";

export class SellerLifecycleForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "SellerLifecycleForbiddenError";
  }
}

export function assertSellerLifecycleAccess(input: {
  role: UserRole | string;
  sellerProfileId: string | null | undefined;
}): asserts input is { role: UserRole | string; sellerProfileId: string } {
  if (input.role === "ADMIN") return;
  if (!input.sellerProfileId) {
    throw new SellerLifecycleForbiddenError(
      "Seller lifecycle requires seller profile",
    );
  }
}

export function assertAdminSellerLifecycleAccess(role: UserRole | string): void {
  if (role !== "ADMIN") {
    throw new SellerLifecycleForbiddenError("Admin access requires ADMIN role");
  }
}
