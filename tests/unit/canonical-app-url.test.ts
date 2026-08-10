import { afterEach, describe, expect, it, vi } from "vitest";

describe("getCanonicalAppUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("prefers NEXT_PUBLIC_APP_URL over PaaS fallbacks", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://other.onrender.com");
    vi.stubEnv("VERCEL_URL", "marketplace-mvp.vercel.app");
    const { getCanonicalAppUrl } = await import("@/lib/env");
    expect(getCanonicalAppUrl()).toBe("https://app.example.com");
  });

  it("falls back to RENDER_EXTERNAL_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("AUTH_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://lot.onrender.com");
    const { getCanonicalAppUrl } = await import("@/lib/env");
    expect(getCanonicalAppUrl()).toBe("https://lot.onrender.com");
  });

  it("falls back to RAILWAY_PUBLIC_DOMAIN", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("AUTH_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("RENDER_EXTERNAL_URL", "");
    vi.stubEnv("RAILWAY_PUBLIC_DOMAIN", "lot.up.railway.app");
    const { getCanonicalAppUrl } = await import("@/lib/env");
    expect(getCanonicalAppUrl()).toBe("https://lot.up.railway.app");
  });
});
