import { describe, expect, it, afterEach } from "vitest";
import { UserRole } from "@prisma/client";

import { auditBuyerJourney } from "@/lib/marketplace-launch-readiness/buyer-checks";
import { auditSellerJourney } from "@/lib/marketplace-launch-readiness/seller-checks";
import { auditSecurityLaunch } from "@/lib/marketplace-launch-readiness/security-checks";
import { auditModerationLaunch } from "@/lib/marketplace-launch-readiness/moderation-checks";
import { scoreFromLaunchChecks } from "@/lib/marketplace-launch-readiness/audit";
import { isMarketplaceLaunchReadinessEnabled } from "@/lib/marketplace-launch-readiness/flags";
import { assertLaunchReadinessAccess } from "@/lib/marketplace-launch-readiness/permissions";
import { buildBuyerDeliverySteps } from "@/lib/marketplace-delivery/delivery/tracking";
import { DeliveryStatus, OrderStatus } from "@prisma/client";

const PREV = process.env.MARKETPLACE_LAUNCH_READINESS_ENABLED;

describe("launch readiness flag", () => {
  afterEach(() => {
    process.env.MARKETPLACE_LAUNCH_READINESS_ENABLED = PREV;
  });

  it("is off by default", () => {
    delete process.env.MARKETPLACE_LAUNCH_READINESS_ENABLED;
    expect(isMarketplaceLaunchReadinessEnabled()).toBe(false);
  });
});

describe("buyer journey audit", () => {
  it("includes core route checks", () => {
    const checks = auditBuyerJourney();
    expect(checks.some((c) => c.id === "buyer-checkout" && c.passed)).toBe(true);
  });
});

describe("seller journey audit", () => {
  it("includes product creation check", () => {
    expect(auditSellerJourney().some((c) => c.id === "seller-product-create")).toBe(
      true,
    );
  });
});

describe("security audit", () => {
  it("requires auth secret in production audit", () => {
    const checks = auditSecurityLaunch();
    expect(checks.some((c) => c.id === "security-auth-secret")).toBe(true);
  });
});

describe("moderation audit", () => {
  it("flags trust loop when disabled", () => {
    delete process.env.MARKETPLACE_TRUST_LOOP_ENABLED;
    const check = auditModerationLaunch().find((c) => c.id === "moderation-trust-loop");
    expect(check?.passed).toBe(false);
  });
});

describe("scoreFromLaunchChecks", () => {
  it("returns 100 when all pass", () => {
    expect(
      scoreFromLaunchChecks([
        { id: "a", label: "A", passed: true, severity: "info" },
      ]),
    ).toBe(100);
  });
});

describe("permissions", () => {
  it("requires admin", () => {
    expect(() => assertLaunchReadinessAccess(UserRole.BUYER)).toThrow();
  });
});

describe("delivery integration", () => {
  it("builds buyer delivery steps", () => {
    const steps = buildBuyerDeliverySteps({
      orderStatus: OrderStatus.IN_TRANSIT,
      deliveryStatus: DeliveryStatus.IN_TRANSIT,
      isPaid: true,
    });
    expect(steps.length).toBe(5);
  });
});
