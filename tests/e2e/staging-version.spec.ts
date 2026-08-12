import { expect, test } from "@playwright/test";

/**
 * DEVOPS-001 — staging must expose a version marker (commit not unknown).
 * Full commit match is enforced by scripts/deploy-verify.mjs in CI/acceptance.
 */
test.describe("DEVOPS-001 staging version marker", () => {
  test("GET /api/version returns staging build info", async ({ request }) => {
    const res = await request.get("/api/version");
    expect(res.status()).toBe(200);
    const json = (await res.json()) as {
      environment: string;
      commit: string;
      buildTime: string;
      version: string;
    };

    expect(json.environment).toBe("staging");
    expect(json.commit).toMatch(/^[0-9a-f]{7}$/);
    expect(json.commit).not.toBe("unknown");
    expect(json.buildTime).not.toBe("unknown");
    expect(json.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("GET /api/health includes version.commit", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      service: string;
      checks: Record<string, unknown>;
      version: { commit: string; buildTime: string };
    };

    expect(json.ok).toBe(true);
    expect(json.service).toBe("marketplace-mvp");
    expect(json.checks).toBeDefined();
    expect(json.version.commit).toMatch(/^[0-9a-f]{7}$/);
    expect(json.version.buildTime).not.toBe("unknown");
  });
});
