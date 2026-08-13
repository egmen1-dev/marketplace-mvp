import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  buildSellerAiSummary,
  emptySellerCommandCenter,
} from "@/lib/marketplace-command-center/dashboard";
import { isMarketplaceCommandCenterEnabled } from "@/lib/marketplace-command-center/flags";
import {
  pickOneNextAction,
  pickTopPriorities,
  priorityCandidate,
  priorityFromGrowth,
  priorityFromTrust,
} from "@/lib/marketplace-command-center/priorities";
import {
  assertCommandCenterAdminAccess,
  assertSellerCommandCenterAccess,
  MarketplaceCommandCenterForbiddenError,
} from "@/lib/marketplace-command-center/permissions";
import { buildSellerOpportunityWidgets } from "@/lib/marketplace-command-center/widgets";

const PREV_FLAG = process.env.MARKETPLACE_COMMAND_CENTER_ENABLED;

describe("pickTopPriorities", () => {
  it("returns top 5 sorted by rankScore", () => {
    const items = pickTopPriorities(
      [
        priorityFromTrust({ action: "A", why: "low" }),
        priorityFromGrowth({
          action: "B",
          reason: "r",
          impact: "i",
          priority: "HIGH",
        }),
      ],
      5,
    );
    expect(items.length).toBe(2);
    expect(items[0]?.rankScore).toBeGreaterThanOrEqual(items[1]?.rankScore ?? 0);
  });

  it("picks one next action", () => {
    const one = pickOneNextAction([
      priorityCandidate({
        id: "low",
        title: "Low",
        source: "LEARNING",
        impact: "x",
        urgency: "LOW",
        action: "a",
        entity: "e",
        why: "w",
        howTo: "h",
        rankScore: 10,
      }),
      priorityFromExecution({
        title: "High",
        description: "d",
        href: "/account/products",
      }),
    ]);
    expect(one?.source).toBe("EXECUTION");
  });
});

function priorityFromExecution(input: {
  title: string;
  description: string;
  href: string;
}) {
  return priorityCandidate({
    id: "exec",
    title: input.title,
    source: "EXECUTION",
    impact: "impact",
    urgency: "HIGH",
    action: input.title,
    entity: "execution",
    why: input.description,
    howTo: input.description,
    href: input.href,
    rankScore: 120,
  });
}

describe("aggregation helpers", () => {
  it("builds seller AI summary for low trust", () => {
    const summary = buildSellerAiSummary({
      totalViews: 120,
      totalProducts: 3,
      health: {
        growthScore: 70,
        trustScore: 45,
        qualityScore: 80,
        learningScore: 60,
      },
    });
    expect(summary).toContain("просмотры");
    expect(summary).toContain("доверия");
  });

  it("builds opportunity widgets", () => {
    const widgets = buildSellerOpportunityWidgets({
      readyForPromotion: 2,
      needsImprovement: 1,
      lowStock: 1,
    });
    expect(widgets.some((w) => w.title === "Продвижение")).toBe(true);
    expect(widgets.length).toBeLessThanOrEqual(5);
  });

  it("empty seller dashboard when disabled", () => {
    expect(emptySellerCommandCenter().enabled).toBe(false);
  });
});

describe("permissions", () => {
  it("allows admin", () => {
    expect(() => assertCommandCenterAdminAccess("ADMIN")).not.toThrow();
  });

  it("blocks non-admin", () => {
    expect(() => assertCommandCenterAdminAccess("BUYER")).toThrow(
      MarketplaceCommandCenterForbiddenError,
    );
  });

  it("requires seller profile", () => {
    expect(() =>
      assertSellerCommandCenterAccess({ role: "BUYER", sellerProfileId: null }),
    ).toThrow(MarketplaceCommandCenterForbiddenError);
  });
});

describe("MARKETPLACE_COMMAND_CENTER_ENABLED flag", () => {
  beforeEach(() => {
    process.env.MARKETPLACE_COMMAND_CENTER_ENABLED = "true";
  });

  afterEach(() => {
    if (PREV_FLAG === undefined) {
      delete process.env.MARKETPLACE_COMMAND_CENTER_ENABLED;
    } else {
      process.env.MARKETPLACE_COMMAND_CENTER_ENABLED = PREV_FLAG;
    }
  });

  it("is on when env true", () => {
    expect(isMarketplaceCommandCenterEnabled()).toBe(true);
  });
});
