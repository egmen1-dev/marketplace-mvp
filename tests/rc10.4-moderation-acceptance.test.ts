import { describe, expect, it } from "vitest";

import { mapPrismaError } from "@/lib/api/prisma-errors";
import { jsonStringArray } from "@/lib/moderation/json-coerce";
import { Prisma } from "@prisma/client";

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

describe("RC10.4 moderation acceptance invariants", () => {
  const acceptance = () =>
    require("node:fs").readFileSync(
      "scripts/rc10.4-moderation-staging-acceptance.mjs",
      "utf8",
    );

  it("uses per-run unique titles and fresh uploads per create", () => {
    const source = acceptance();
    expect(source).toContain("RC10_4_ACCEPTANCE_RUN_ID");
    expect(source).toContain("getUpload(token, false)");
    expect(source).toContain("cloneCharacteristics");
    expect(source).not.toContain("createAttempt = await json");
  });

  it("documents sequential create-after-approve regression path", () => {
    const source = acceptance();
    expect(source).toContain("scenarioTag: \"A\"");
    expect(source).toContain("scenarioTag: \"C\"");
    expect(source).toContain("adminDecision(lotA.productId, \"APPROVE\"");
    expect(source).toContain("createAndSubmitLot(sellerToken");
  });
});
