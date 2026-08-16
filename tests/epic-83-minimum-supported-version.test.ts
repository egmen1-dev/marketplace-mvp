#!/usr/bin/env tsx
/** EPIC 83 — minimum supported version + unsupported client contract */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_CODE,
  CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_NAME,
} from "@/lib/mobile-release-platform/baseline";
import { buildMobileBootstrapPayload } from "@/lib/mobile/bootstrap";
import { buildMobileUpdatePayload } from "@/lib/mobile-release-platform/update-service";
import type { ReleaseVersion } from "@/lib/mobile-release-platform/types";

const publishedRelease: ReleaseVersion = {
  id: "rel-012",
  versionName: "0.1.2-alpha",
  versionCode: 3,
  gitCommit: "abc1234",
  sha256: "sha256-test",
  channel: "CLOSED_ALPHA",
  releaseNotes: "First supported baseline",
  publishedAt: "2026-08-16T00:00:00.000Z",
  minBackendVersion: "mobile-v1",
  minAppVersion: "0.1.2-alpha",
  buildNumber: "3",
  status: "PUBLISHED",
  downloadUrl: "https://example.com/lot-012.apk",
  artifactSizeBytes: 94000000,
  rolloutPercent: 100,
  mandatory: false,
  packageId: "ru.lot.marketplace.alpha",
};

const previousRelease: ReleaseVersion = {
  ...publishedRelease,
  id: "rel-011",
  versionName: "0.1.1-alpha",
  versionCode: 2,
  downloadUrl: "https://example.com/lot-011.apk",
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mobileReleaseVersion: {
      count: vi.fn(async () => 3),
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

async function fetchJson(path: string) {
  const res = await fetch(`${STAGING}${path}`, { signal: AbortSignal.timeout(15000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

describe("EPIC 83 minimum supported version", () => {
  beforeEach(() => {
    process.env.CCOS_ENABLED = "true";
    vi.clearAllMocks();
  });

  it("defines 0.1.2-alpha (code 3) as minimum supported Closed Alpha", () => {
    expect(CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_CODE).toBe(3);
    expect(CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_NAME).toBe("0.1.2-alpha");
  });

  it("returns UNSUPPORTED_CLIENT for versionCode 1 (0.1.0 prototype)", async () => {
    const payload = await buildMobileUpdatePayload({
      clientVersionCode: 1,
      deviceId: "epic83-test",
      channel: "CLOSED_ALPHA",
    });
    expect(payload.updateState).toBe("UNSUPPORTED_CLIENT");
    expect(payload.reason).toBe("CLIENT_TOO_OLD");
    expect(payload.minimumVersionCode).toBe(3);
    expect(payload.minimumVersionName).toBe("0.1.2-alpha");
    expect(payload.downloadUrl).toBeTruthy();
    expect(payload.updateRequired).toBe(true);
  });

  it("returns UNSUPPORTED_CLIENT for versionCode 2 (0.1.1 transitional)", async () => {
    const payload = await buildMobileUpdatePayload({
      clientVersionCode: 2,
      deviceId: "epic83-test",
      channel: "CLOSED_ALPHA",
    });
    expect(payload.updateState).toBe("UNSUPPORTED_CLIENT");
    expect(payload.reason).toBe("CLIENT_TOO_OLD");
  });

  it("returns NO_UPDATE for supported client on latest version", async () => {
    const payload = await buildMobileUpdatePayload({
      clientVersionCode: 3,
      deviceId: "epic83-test",
      channel: "CLOSED_ALPHA",
    });
    expect(payload.updateState).toBe("NO_UPDATE");
  });

  it("local update route returns UNSUPPORTED_CLIENT payload shape for versionCode=1", async () => {
    const { GET } = await import("@/app/api/mobile/update/route");
    const response = await GET(
      new Request("http://localhost/api/mobile/update?versionCode=1&deviceId=epic83-test&channel=CLOSED_ALPHA"),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.updateState).toBe("UNSUPPORTED_CLIENT");
    expect(body.reason).toBe("CLIENT_TOO_OLD");
    expect(body.minimumVersionCode).toBe(3);
    expect(body.minimumVersionName).toBe("0.1.2-alpha");
    expect(body.downloadUrl).toBeTruthy();
  });

  it("bootstrap exposes minimumSupportedVersionCode for clients", () => {
    const bootstrap = buildMobileBootstrapPayload();
    expect(bootstrap.minimumSupportedVersionCode).toBe(3);
    expect(bootstrap.minimumSupportedAppVersion).toBe("0.1.2-alpha");
  });

  it("staging boot endpoint responds for migration clients", async () => {
    const bootstrap = await fetchJson("/api/mobile/bootstrap");
    expect(bootstrap.ok).toBe(true);
  });
});
