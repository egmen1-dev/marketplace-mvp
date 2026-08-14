import { UserRole } from "@prisma/client";

export function assertSocialGrowthAdminAccess(role: UserRole): void {
  if (role !== UserRole.ADMIN) {
    throw new Error("Admin access required");
  }
}

export function assertSocialCollectionOwner(input: {
  ownerId: string;
  userId: string;
}): void {
  if (input.ownerId !== input.userId) {
    throw new Error("Collection access denied");
  }
}
