import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";

import { mapPrismaError } from "@/lib/api/prisma-errors";
import { jsonStringArray } from "@/lib/moderation/json-coerce";

describe("mapPrismaError", () => {
  it("maps P2002 to 409 UNIQUE_CONSTRAINT", () => {
    const err = new Prisma.PrismaClientKnownRequestError("duplicate", {
      code: "P2002",
      clientVersion: "test",
      meta: { target: ["sellerId", "slug"] },
    });
    const mapped = mapPrismaError(err);
    expect(mapped?.status).toBe(409);
    expect(mapped?.code).toBe("UNIQUE_CONSTRAINT");
    expect(mapped?.constraint).toContain("sellerId");
  });

  it("returns null for non-prisma errors", () => {
    expect(mapPrismaError(new Error("boom"))).toBeNull();
  });
});

describe("jsonStringArray", () => {
  it("coerces moderation Json arrays safely", () => {
    expect(jsonStringArray(["A", "B"])).toEqual(["A", "B"]);
    expect(jsonStringArray({ bad: true })).toEqual([]);
    expect(jsonStringArray(null)).toEqual([]);
  });
});

describe("mobile-lot-moderation lifecycle idempotency", () => {
  it("duplicate APPROVE on already-reviewed LOT returns ALREADY_REVIEWED", () => {
    const lifecycle = readFileSync("lib/moderation/lifecycle.ts", "utf8");
    expect(lifecycle).toContain("moderation.status === ModerationStatus.APPROVED");
    expect(lifecycle).toContain('code: "ALREADY_REVIEWED"');
    expect(lifecycle).not.toContain('input.decision !== "APPROVE"');
  });
});

describe("RC10.4 moderation acceptance invariants", () => {
  const acceptance = () =>
    readFileSync("scripts/rc10.4-moderation-staging-acceptance.mjs", "utf8");

  it("uses per-run unique titles and fixture markers", () => {
    const source = acceptance();
    expect(source).toContain("RC10_4_ACCEPTANCE_RUN_ID");
    expect(source).toContain("rc104-${RUN_ID}");
    expect(source).toContain("cloneCharacteristics");
    expect(source).not.toContain("createAttempt = await json");
  });

  it("tracks server 500 events and forbids masking retries", () => {
    const source = acceptance();
    expect(source).toContain("server500Events");
    expect(source).toContain("unexplainedServer500Count");
    expect(source).not.toContain("createAndSubmitLotResilient");
    expect(source).not.toContain("title} retry");
  });

  it("documents sequential create-after-approve regression path", () => {
    const source = acceptance();
    expect(source).toContain('scenarioTag: "A"');
    expect(source).toContain('scenarioTag: "C"');
    expect(source).toContain('adminDecision(lotA.productId, "APPROVE"');
    expect(source).toContain("createAndSubmitLot(sellerToken");
  });
});

describe("admin moderation auth contract", () => {
  it("admin moderation route resolves Bearer auth and returns 403 for non-admin", () => {
    const adminRoute = readFileSync("app/api/admin/moderation/[id]/decision/route.ts", "utf8");
    expect(adminRoute).toContain("requireAdminFromRequest");
    expect(adminRoute).toContain("status: 403");
  });
});
