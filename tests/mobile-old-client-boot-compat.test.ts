#!/usr/bin/env tsx
/** Simulates installed 0.1.0-alpha boot HTTP sequence against staging */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildMobileUpdatePayload } from "@/lib/mobile-release-platform/update-service";
import {
  buildLegacyMobileUpdatePayload,
  LEGACY_MOBILE_UPDATE_MAX_VERSION_CODE,
} from "@/lib/mobile-release-platform/update-service/legacy";
import type { ReleaseVersion } from "@/lib/mobile-release-platform/types";

const publishedRelease: ReleaseVersion = {
  id: "rel-011",
  versionName: "0.1.1-alpha",
  versionCode: 2,
  gitCommit: "abc1234",
  sha256: "sha256-test",
  channel: "CLOSED_ALPHA",
  releaseNotes: "Bug fixes",
  publishedAt: "2026-08-16T00:00:00.000Z",
  minBackendVersion: "mobile-v1",
  minAppVersion: "0.1.0-alpha",
  buildNumber: "2",
  status: "PUBLISHED",
  downloadUrl: "https://example.com/lot-011.apk",
  artifactSizeBytes: 90000000,
  rolloutPercent: 100,
  mandatory: false,
  packageId: "ru.lot.marketplace.alpha",
};

const previousRelease: ReleaseVersion = {
  ...publishedRelease,
  id: "rel-010",
  versionName: "0.1.0-alpha",
  versionCode: 1,
  downloadUrl: "https://example.com/lot-010.apk",
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mobileReleaseVersion: {
      count: vi.fn(async () => 2),
      findFirst: vi.fn(async () => publishedRelease),
      findMany: vi.fn(async () => [publishedRelease, previousRelease]),
    },
  },
}));

vi.mock("@/lib/mobile-release-platform/registry", () => ({
  seedRegistryFromManifestIfEmpty: vi.fn(async () => null),
  getLatestPublishedRelease: vi.fn(async () => publishedRelease),
  listReleaseVersions: vi.fn(async () => [publishedRelease, previousRelease]),
}));

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const DEVICE = "old-client-boot-compat-test";

async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(`${STAGING}${path}`, { ...init, signal: AbortSignal.timeout(15000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

describe("0.1.0-alpha backward compatibility on current staging", () => {
  beforeEach(() => {
    process.env.CCOS_ENABLED = "true";
    vi.clearAllMocks();
  });
  it("boot endpoints respond successfully for legacy client", async () => {
    const bootstrap = await fetchJson("/api/mobile/bootstrap");
    expect(bootstrap.ok, `bootstrap ${bootstrap.status}`).toBe(true);
    expect(bootstrap.body).toMatchObject({ apiVersion: expect.any(String), schemaVersion: expect.any(String) });
    expect((bootstrap.body as { forceUpgrade?: boolean }).forceUpgrade).not.toBe(true);

    const config = await fetchJson("/api/product-ops/config?surface=mobile&deviceId=" + encodeURIComponent(DEVICE));
    expect(config.ok, `remote config ${config.status}`).toBe(true);
    expect(Array.isArray((config.body as { flags?: unknown[] }).flags)).toBe(true);

    const readiness = await fetchJson("/api/mobile/readiness");
    expect(readiness.ok, `readiness ${readiness.status}`).toBe(true);

    const mobileConfig = await fetchJson("/api/mobile/config");
    expect(mobileConfig.ok, `mobile config ${mobileConfig.status}`).toBe(true);
  });

  it("update offer for versionCode=1 is optional on staging", async () => {
    const live = await fetchJson(
      `/api/mobile/update?versionCode=1&deviceId=${encodeURIComponent(DEVICE)}&channel=CLOSED_ALPHA`,
    );
    expect(live.ok).toBe(true);
    const body = live.body as {
      updateRequired?: boolean;
      mandatory?: boolean;
      downloadUrl?: string | null;
      versionName?: string;
    };
    expect(body.updateRequired).toBe(false);
    expect(body.mandatory).toBe(false);
    expect(body.downloadUrl).toBeTruthy();
    expect(body.versionName).toBe("0.1.1-alpha");
  });

  it("local update route strips EPIC 82 fields for versionCode=1", async () => {
    const { GET } = await import("@/app/api/mobile/update/route");
    const request = new Request(
      `http://localhost/api/mobile/update?versionCode=1&deviceId=${encodeURIComponent(DEVICE)}&channel=CLOSED_ALPHA`,
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.updateRequired).toBe(false);
    expect(body.mandatory).toBe(false);
    expect(body.downloadUrl).toBeTruthy();
    expect(body).not.toHaveProperty("updateState");
    expect(body).not.toHaveProperty("knownIssues");
    expect(body).not.toHaveProperty("previousRelease");
    expect(body).not.toHaveProperty("artifactSizeBytes");
  });

  it("legacy builder matches shipped 0.1.0 schema", async () => {
    const payload = await buildMobileUpdatePayload({ clientVersionCode: 1, deviceId: DEVICE, channel: "CLOSED_ALPHA" });
    const legacy = buildLegacyMobileUpdatePayload(payload);
    expect(legacy.updateRequired).toBe(false);
    expect(legacy.mandatory).toBe(false);
    expect(legacy.downloadUrl).toBeTruthy();
    expect(LEGACY_MOBILE_UPDATE_MAX_VERSION_CODE).toBe(1);
  });

  it("versionCode=2 receives full payload with NO_UPDATE", async () => {
    const live = await fetchJson(
      `/api/mobile/update?versionCode=2&deviceId=${encodeURIComponent(DEVICE)}&channel=CLOSED_ALPHA`,
    );
    expect((live.body as { updateState?: string }).updateState).toBe("NO_UPDATE");
  });
});
