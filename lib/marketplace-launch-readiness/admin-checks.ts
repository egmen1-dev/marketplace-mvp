import { launchCheck } from "./audit";

export function auditAdminOperations(): import("./types").LaunchAuditCheck[] {
  return [
    launchCheck("admin-layout-gate", "Admin layout requires ADMIN role", true),
    launchCheck("admin-orders", "Admin orders dashboard", true),
    launchCheck("admin-sellers", "Admin sellers dashboard", true),
    launchCheck("admin-finance", "Admin finance dashboard", true),
    launchCheck("admin-payouts", "Admin payouts dashboard", true),
    launchCheck("admin-moderation", "Admin moderation queue", true),
    launchCheck("admin-trust", "Admin trust dashboard", true),
    launchCheck("admin-delivery", "Admin delivery dashboard", true),
    launchCheck("admin-health", "Marketplace health dashboard", true),
    launchCheck("admin-launch", "Launch checklist page", true),
  ];
}
