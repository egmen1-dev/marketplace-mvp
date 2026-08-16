import { describe, expect, it } from "vitest";

import { buildMobileBootstrapPayload } from "@/lib/mobile/bootstrap";
import { buildMobileClientConfig } from "@/lib/mobile/client-config";
import {
  MOBILE_APP_VERSION,
  MOBILE_MIN_SUPPORTED_APP_VERSION,
  MOBILE_RECOMMENDED_APP_VERSION,
} from "@/lib/mobile/api-contract";

describe("mobile app version compatibility", () => {
  it("exposes safe default app version constants", () => {
    expect(MOBILE_APP_VERSION).toBe("0.0.0-dev");
    expect(MOBILE_MIN_SUPPORTED_APP_VERSION).toBe("0.0.0-dev");
    expect(MOBILE_RECOMMENDED_APP_VERSION).toBe("0.0.0-dev");
  });

  it("includes compatibility fields in bootstrap payload", () => {
    process.env.CCOS_ENABLED = "true";
    const bootstrap = buildMobileBootstrapPayload();
    expect(bootstrap.minimumSupportedAppVersion).toBe(MOBILE_MIN_SUPPORTED_APP_VERSION);
    expect(bootstrap.recommendedAppVersion).toBe(MOBILE_RECOMMENDED_APP_VERSION);
    expect(bootstrap.forceUpgrade).toBe(false);
    expect(bootstrap.apiVersion).toBeTruthy();
    expect(bootstrap.schemaVersion).toBeTruthy();
  });

  it("includes versioning on config payload", () => {
    process.env.CCOS_ENABLED = "true";
    const config = buildMobileClientConfig();
    expect(config.apiVersion).toBeTruthy();
    expect(config.schemaVersion).toBeTruthy();
    expect(config.releaseChannel).toMatch(/dev|staging|prod/);
  });
});
