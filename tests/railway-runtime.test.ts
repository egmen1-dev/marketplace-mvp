import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { collectPrismaCliRuntime } from "../scripts/collect-prisma-cli-runtime.mjs";

describe("Prisma CLI runtime collection", () => {
  it("collects effect and other transitive Prisma CLI dependencies", () => {
    const dest = mkdtempSync(join(tmpdir(), "prisma-runtime-"));
    try {
      const result = collectPrismaCliRuntime(process.cwd(), dest);
      expect(result.packageCount).toBeGreaterThan(10);
      expect(result.packages).toContain("effect");
      expect(existsSync(join(dest, "node_modules", "effect", "package.json"))).toBe(true);
      expect(existsSync(join(dest, "node_modules", "prisma", "build", "index.js"))).toBe(true);
      expect(existsSync(join(dest, "prisma", "migrations"))).toBe(true);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it("Dockerfile uses prisma-runtime stage instead of cherry-picked packages", async () => {
    const { readFileSync } = await import("node:fs");
    const dockerfile = readFileSync("Dockerfile", "utf8");
    expect(dockerfile).toContain("FROM base AS prisma-runtime");
    expect(dockerfile).toContain("collect-prisma-cli-runtime.mjs");
    expect(dockerfile).toContain("COPY --from=prisma-runtime /prisma-cli-runtime/node_modules/");
    expect(dockerfile).not.toContain("COPY --from=deps /app/node_modules/prisma ./node_modules/prisma");
  });
});
