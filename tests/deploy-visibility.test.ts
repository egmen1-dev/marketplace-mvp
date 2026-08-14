import { describe, expect, it, afterEach } from "vitest";

import {
  buildAllModuleRows,
  buildModuleVisibilityRow,
  readFlagStatus,
  REQUIRED_FLAG_ENV_VARS,
} from "@/lib/marketplace-deploy-visibility/registry";
import { MODULE_REGISTRY } from "@/lib/marketplace-deploy-visibility/registry";
import { getDemoScenarios, getMarketplaceDebugSnapshot } from "@/lib/marketplace-deploy-visibility/queries";
import { isMarketplaceDebugQuery } from "@/lib/marketplace-deploy-visibility/debug";
import { isMarketplaceDeployVisibilityEnabled } from "@/lib/marketplace-deploy-visibility/flags";

describe("deploy visibility registry", () => {
  it("lists required marketplace flags", () => {
    expect(REQUIRED_FLAG_ENV_VARS).toContain("MARKETPLACE_TRUST_LOOP_ENABLED");
    expect(REQUIRED_FLAG_ENV_VARS).toContain("SELLER_PAYOUT_ENABLED");
    expect(REQUIRED_FLAG_ENV_VARS.length).toBeGreaterThanOrEqual(16);
  });

  it("marks modules off main as not staging visible", () => {
    const row = buildModuleVisibilityRow(MODULE_REGISTRY.find((m) => m.id === "trust_loop")!);
    expect(row.onMainBranch).toBe(false);
    expect(row.visibleOnStaging).toBe(false);
  });

  it("reads flag status from env", () => {
    const prev = process.env.MARKETPLACE_DISCOVERY_ENABLED;
    process.env.MARKETPLACE_DISCOVERY_ENABLED = "true";
    expect(readFlagStatus("MARKETPLACE_DISCOVERY_ENABLED")).toBe("ON");
    if (prev === undefined) delete process.env.MARKETPLACE_DISCOVERY_ENABLED;
    else process.env.MARKETPLACE_DISCOVERY_ENABLED = prev;
  });

  it("builds module matrix rows", () => {
    const rows = buildAllModuleRows();
    expect(rows.some((r) => r.id === "new_seller_trust")).toBe(true);
  });
});

describe("debug mode", () => {
  it("detects marketplace debug query", () => {
    expect(isMarketplaceDebugQuery("?debug=marketplace")).toBe(true);
    expect(isMarketplaceDebugQuery("?debug=other")).toBe(false);
  });

  it("returns debug snapshot", () => {
    const snapshot = getMarketplaceDebugSnapshot();
    expect(snapshot.buildCommit).toBeTruthy();
    expect(Array.isArray(snapshot.activeModules)).toBe(true);
  });
});

describe("demo scenarios", () => {
  it("defines three audit personas", () => {
    const scenarios = getDemoScenarios();
    expect(scenarios.map((s) => s.id)).toEqual([
      "new_seller",
      "developing_seller",
      "problem_seller",
    ]);
  });
});

describe("deploy visibility flag", () => {
  afterEach(() => {
    delete process.env.MARKETPLACE_DEPLOY_VISIBILITY_ENABLED;
  });

  it("is enabled by default", () => {
    expect(isMarketplaceDeployVisibilityEnabled()).toBe(true);
  });
});
