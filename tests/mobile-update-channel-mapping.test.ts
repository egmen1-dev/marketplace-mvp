import { describe, expect, it } from "vitest";

import { resolveMRPChannelFromClient } from "@/lib/mobile-release-platform/channels";

describe("resolveMRPChannelFromClient", () => {
  it("maps CLOSED_BETA to BETA registry channel", () => {
    expect(resolveMRPChannelFromClient("CLOSED_BETA")).toBe("BETA");
  });

  it("maps CLOSED_ALPHA to CLOSED_ALPHA", () => {
    expect(resolveMRPChannelFromClient("CLOSED_ALPHA")).toBe("CLOSED_ALPHA");
  });

  it("maps BETA to BETA", () => {
    expect(resolveMRPChannelFromClient("BETA")).toBe("BETA");
  });

  it("defaults unknown channels to CLOSED_ALPHA", () => {
    expect(resolveMRPChannelFromClient(undefined)).toBe("CLOSED_ALPHA");
    expect(resolveMRPChannelFromClient("")).toBe("CLOSED_ALPHA");
  });
});
