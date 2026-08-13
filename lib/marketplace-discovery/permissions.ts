import { UserRole } from "@prisma/client";

export function assertDiscoveryAdminAccess(role: UserRole): void {
  if (role !== UserRole.ADMIN) {
    throw new Error("Admin access required");
  }
}
