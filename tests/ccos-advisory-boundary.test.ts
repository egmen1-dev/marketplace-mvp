import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("ccos advisory boundary", () => {
  it("resolveOrderBy does not import CCOS or Marketplace Cognitive Platform", () => {
    const source = readFileSync(
      resolve(process.cwd(), "features/products/queries.ts"),
      "utf8",
    );

    expect(source.includes("@/lib/ccos")).toBe(false);
    expect(source.includes("lib/ccos")).toBe(false);
    expect(source.includes("marketplace-cognitive-platform")).toBe(false);
    expect(source.includes("getCognitiveProductReport")).toBe(false);
    expect(source.includes("collectObservations")).toBe(false);
  });

  it("lib/ccos does not import marketplace modules", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/ccos/index.ts"), "utf8");
    expect(source.includes("marketplace-")).toBe(false);
  });
});
