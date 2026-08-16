import { describe, expect, it } from "vitest";

import { CLOSED_ALPHA_APK } from "@/lib/mobile-release-platform/constants";

describe("epic 80 closed alpha artifact", () => {
  it("documents artifact metadata route", async () => {
    const route = await import("@/app/api/mobile/releases/artifact/route");
    expect(typeof route.GET).toBe("function");
  });

  it("documents download redirect route", async () => {
    const route = await import("@/app/api/mobile/releases/download/[versionName]/route");
    expect(typeof route.GET).toBe("function");
  });

  it("keeps immutable sha256 constant", () => {
    expect(CLOSED_ALPHA_APK.sha256).toBe(
      "91adc3822f4e1cc898bb605f2afb78a47c62d701a6054b5e92603cd0a1628585",
    );
  });
});
