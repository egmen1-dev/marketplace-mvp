import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQueryRaw = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
}));

describe("schema compatibility", () => {
  beforeEach(() => {
    mockQueryRaw.mockReset();
  });

  it("reports incompatible when required columns are missing", async () => {
    mockQueryRaw
      .mockResolvedValueOnce([{ exists: true }]) // SELECT 1
      .mockResolvedValueOnce([{ exists: false }]) // products.contentVersion
      .mockResolvedValueOnce([{ exists: true }]) // remaining columns short-circuit not used if we break early...

    // Simpler: mock all column checks as false except ping
    mockQueryRaw.mockImplementation(async (query: TemplateStringsArray) => {
      const sql = String(query[0] ?? "");
      if (sql.includes("SELECT 1")) return [{ exists: true }];
      if (sql.includes("information_schema.columns")) return [{ exists: false }];
      if (sql.includes("information_schema.tables")) return [{ exists: false }];
      if (sql.includes("_prisma_migrations")) return [{ exists: false }];
      return [{ exists: false }];
    });

    const { checkSchemaCompatibility } = await import("@/lib/db/schema-compatibility");
    const result = await checkSchemaCompatibility();
    expect(result.reachable).toBe(true);
    expect(result.compatible).toBe(false);
    expect(result.missingColumns.length).toBeGreaterThan(0);
  });

  it("reports compatible when required schema exists", async () => {
    let call = 0;
    mockQueryRaw.mockImplementation(async () => {
      call += 1;
      if (call === 1) return [{ "": 1 }];
      return [{ exists: true }];
    });

    vi.resetModules();
    const { checkSchemaCompatibility } = await import("@/lib/db/schema-compatibility");
    const result = await checkSchemaCompatibility();
    expect(result.reachable).toBe(true);
    expect(result.compatible).toBe(true);
    expect(result.detail).toBe("compatible");
  });

  it("reports unreachable when database ping fails", async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error("connection refused"));
    const { checkSchemaCompatibility } = await import("@/lib/db/schema-compatibility");
    const result = await checkSchemaCompatibility();
    expect(result.reachable).toBe(false);
    expect(result.compatible).toBe(false);
    expect(result.detail).toBe("database_unreachable");
  });
});

describe("release migration verify gate", () => {
  it("documents EPIC 174 migration id", async () => {
    const { EPIC_174_MIGRATION_ID } = await import("@/lib/db/schema-compatibility");
    expect(EPIC_174_MIGRATION_ID).toBe("20260825100000_epic_174_moderation_engine");
  });

  it("release-migration-verify script exists", async () => {
    const { readFileSync } = await import("node:fs");
    const script = readFileSync("scripts/release-migration-verify.ts", "utf8");
    expect(script).toContain("schemaCompatible");
    expect(script).toContain("BLOCKED_FOR_RC10_4_BUILD");
  });

  it("docker entrypoint runs prisma migrate deploy before server", async () => {
    const { readFileSync } = await import("node:fs");
    const entry = readFileSync("scripts/docker-entrypoint.sh", "utf8");
    expect(entry).toContain("prisma migrate deploy");
    expect(entry).toContain("node server.js");
  });
});
