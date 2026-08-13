import { UserRole } from "@prisma/client";

export function assertSellerDeliveryAccess(role: UserRole): void {
  if (role !== UserRole.SELLER && role !== UserRole.ADMIN) {
    throw new Error("Seller access required");
  }
}

export function assertAdminDeliveryAccess(role: UserRole): void {
  if (role !== UserRole.ADMIN) {
    throw new Error("Admin access required");
  }
}

export function assertBuyerDeliveryAccess(input: {
  buyerId: string;
  userId: string;
}): void {
  if (input.buyerId !== input.userId) {
    throw new Error("Order access denied");
  }
}
