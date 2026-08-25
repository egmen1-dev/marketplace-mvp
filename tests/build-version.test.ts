import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  __resetBuildInfoCacheForTests,
  getAppEnvironment,
  getBuildInfo,
  getBuildVersionInfo,
} from "@/lib/build-info";

const GENERATED_PATH = join(process.cwd(), "lib/build-info.generated.json");

function writeGenerated(data: { commit: string; buildTime: string }) {
  writeFileSync(GENERATED_PATH, `${JSON.stringify(data, null, 2)}\n`);
  __resetBuildInfoCacheForTests();
}

describe("build info", () => {
  beforeEach(() => {
    writeGenerated({ commit: "unknown", buildTime: "unknown" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    __resetBuildInfoCacheForTests();
  });

  it("defaults to development locally", () => {
    expect(getAppEnvironment()).toBe("development");
  });

  it("labels Railway as staging", () => {
    vi.stubEnv("RAILWAY_ENVIRONMENT", "production");
    expect(getAppEnvironment()).toBe("staging");
  });

  it("respects APP_ENV override", () => {
    vi.stubEnv("APP_ENV", "staging");
    expect(getAppEnvironment()).toBe("staging");
  });

  it("labels Vercel production", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(getAppEnvironment()).toBe("production");
  });

  it("returns version fields without secrets", () => {
    writeGenerated({ commit: "abc1234", buildTime: "2026-08-12T12:00:00.000Z" });
    const info = getBuildInfo();
    expect(info.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(info.commit).toBe("abc1234");
    expect(info.buildTime).toBe("2026-08-12T12:00:00.000Z");
    expect(info).not.toHaveProperty("DATABASE_URL");
    expect(info).not.toHaveProperty("AUTH_SECRET");
  });

  it("getBuildVersionInfo exposes commit and buildTime only", () => {
    writeGenerated({ commit: "deadbee", buildTime: "2026-01-01T00:00:00.000Z" });
    expect(getBuildVersionInfo()).toEqual({
      commit: "deadbee",
      buildTime: "2026-01-01T00:00:00.000Z",
    });
  });
});

describe("GET /api/version", () => {
  beforeEach(() => {
    writeGenerated({ commit: "58e681f", buildTime: "2026-08-12T19:00:00.000Z" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    __resetBuildInfoCacheForTests();
  });

  it("returns public build marker JSON", async () => {
    vi.stubEnv("APP_ENV", "staging");
    const { GET } = await import("@/app/api/version/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toEqual({
      environment: "staging",
      commit: "58e681f",
      buildTime: "2026-08-12T19:00:00.000Z",
      version: expect.any(String),
    });
    expect(json).not.toHaveProperty("checks");
    expect(json).not.toHaveProperty("database");
  });
});

describe("GET /api/health", () => {
  beforeEach(() => {
    writeGenerated({ commit: "58e681f", buildTime: "2026-08-12T19:00:00.000Z" });
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/db/schema-compatibility");
    __resetBuildInfoCacheForTests();
  });

  it("keeps legacy contract and adds version", async () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-for-health");
    vi.doMock("@/lib/db/schema-compatibility", () => ({
      checkSchemaCompatibility: vi.fn(async () => ({
        compatible: true,
        reachable: true,
        missingColumns: [],
        missingTables: [],
        epic174MigrationApplied: true,
        detail: "compatible",
      })),
    }));
    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const json = (await res.json()) as {
      ok: boolean;
      service: string;
      timestamp: string;
      version: { commit: string; buildTime: string };
      checks: {
        database: { reachable?: boolean; schemaCompatible?: boolean };
      };
      runtime?: { trustLoopEnabled?: boolean; moderationAutomationMode?: string };
    };
    expect(json.service).toBe("marketplace-mvp");
    expect(typeof json.timestamp).toBe("string");
    expect(json.checks).toBeDefined();
    expect(json.version.commit).toBe("58e681f");
    expect(json.version.buildTime).toBe("2026-08-12T19:00:00.000Z");
    expect(typeof json.ok).toBe("boolean");
    expect(json.checks.database.reachable).toBe(true);
    expect(json.checks.database.schemaCompatible).toBe(true);
    expect(json.runtime?.moderationAutomationMode).toBeDefined();
  });
});
