import { UserRole } from "@prisma/client";

export class LaunchReadinessForbiddenError extends Error {
  constructor() {
    super("Admin access required");
    this.name = "LaunchReadinessForbiddenError";
  }
}

export function assertLaunchReadinessAccess(role: UserRole): void {
  if (role !== UserRole.ADMIN) {
    throw new LaunchReadinessForbiddenError();
  }
}
