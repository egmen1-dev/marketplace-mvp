import { describe, expect, it, beforeEach } from "vitest";

import { buildMobileBootstrapPayload } from "@/lib/mobile/bootstrap";
import { buildMobileSellerHomePayload } from "@/lib/mobile/seller-home";
import { buildMobileBuyerHomePayload } from "@/lib/mobile/buyer-home";
import { MOBILE_PAGINATION_CONTRACT, buildMobileError } from "@/lib/mobile/error-contract";
import { evaluateNativeAppShellStartGate } from "@/lib/mobile/native-shell-gate";
import { runReleaseReadinessCheck } from "@/lib/mobile/release-readiness";

describe("mobile wave 6 contracts", () => {
  beforeEach(() => {
    process.env.CCOS_ENABLED = "true";
    process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED = "true";
    process.env.CCOS_GRAPH_PLATFORM_ENABLED = "true";
    process.env.CCOS_TWIN_PLATFORM_ENABLED = "true";
  });

  it("exposes cognitive capabilities in bootstrap", () => {
    const bootstrap = buildMobileBootstrapPayload();
    expect(bootstrap.cognitiveCapabilities.brain).toBe(true);
    expect(bootstrap.cognitiveCapabilities.evolutionVisible).toBe(false);
    expect(bootstrap.cognitiveCapabilities.autopilot).toBe(false);
    expect(bootstrap.brainSchemaVersion).toBe("brain-schema-v1");
    expect(bootstrap.supportedModes).toEqual(["buyer", "seller"]);
  });

  it("defines seller and buyer home compact payloads", () => {
    const seller = buildMobileSellerHomePayload();
    expect(seller.money).toBeDefined();
    expect(seller.intelligence.topAction).toBeNull();
    const buyer = buildMobileBuyerHomePayload();
    expect(buyer.discovery).toBeDefined();
  });

  it("freezes error and pagination contracts", () => {
    const err = buildMobileError("TOKEN_EXPIRED", "Token expired", true);
    expect(err.error.retryable).toBe(true);
    expect(MOBILE_PAGINATION_CONTRACT.version).toBe("mobile-pagination-v1");
  });

  it("reports native app shell start gate", () => {
    const gate = evaluateNativeAppShellStartGate();
    expect(["READY", "NOT_READY"]).toContain(gate.status);
  });

  it("includes wave 6 readiness checks", () => {
    const report = runReleaseReadinessCheck();
    expect(report.checks.some((c) => c.id === "seller_home_contract" && c.ok)).toBe(true);
    expect(report.checks.some((c) => c.id === "cognitive_capabilities_manifest" && c.ok)).toBe(true);
  });
});
