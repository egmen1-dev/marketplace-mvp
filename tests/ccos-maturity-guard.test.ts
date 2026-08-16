import { describe, expect, it } from "vitest";

import {
  MARKETPLACE_BRAIN_MATURITY,
  assertBrainCapability,
  requireBrainCapability,
} from "@/lib/ccos/governance/maturity";
import {
  assertNoFinancialExecution,
  denyAutopilotExecution,
} from "@/lib/ccos/governance/advisory-guard";

describe("ccos maturity guard", () => {
  it("L2 advisor can recommend but not simulate or execute", () => {
    expect(assertBrainCapability(MARKETPLACE_BRAIN_MATURITY, "recommend")).toBe(true);
    expect(assertBrainCapability(MARKETPLACE_BRAIN_MATURITY, "simulate")).toBe(false);
    expect(assertBrainCapability(MARKETPLACE_BRAIN_MATURITY, "execute")).toBe(false);
    expect(() => requireBrainCapability(MARKETPLACE_BRAIN_MATURITY, "execute")).toThrow();
  });

  it("denies autopilot execution in Wave 0", () => {
    expect(() => denyAutopilotExecution("L4_AUTOPILOT")).toThrow(/disabled|cannot execute/);
  });

  it("hard-denies financial execution", () => {
    expect(() => assertNoFinancialExecution("wallet debit")).toThrow(/financial action/);
  });
});
