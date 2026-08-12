import { describe, expect, it } from "vitest";

import { isEmbeddedWebViewUserAgent } from "@/lib/webview/detect";

describe("isEmbeddedWebViewUserAgent", () => {
  it("detects VK Android in-app browser", () => {
    expect(
      isEmbeddedWebViewUserAgent(
        "Mozilla/5.0 (Linux; Android 12) Chrome/112.0.0.0 Mobile Safari/537.36 VKAndroidApp/8.15",
      ),
    ).toBe(true);
  });

  it("detects Telegram in-app browser", () => {
    expect(
      isEmbeddedWebViewUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Telegram/9.0",
      ),
    ).toBe(true);
  });

  it("does not flag desktop Chrome", () => {
    expect(
      isEmbeddedWebViewUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe(false);
  });
});

describe("page load telemetry schema", () => {
  it("accepts minimal payload shape", async () => {
    const { POST } = await import("@/app/api/telemetry/page-load/route");
    const res = await POST(
      new Request("http://localhost/api/telemetry/page-load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "page_load_start",
          route: "/",
          webview: true,
        }),
      }),
    );
    expect(res.status).toBe(200);
  });
});
