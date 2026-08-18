import { describe, expect, it } from "vitest";

import {
  issueCheckoutHandoffToken,
  verifyCheckoutHandoffToken,
} from "@/lib/mobile/checkout-handoff";

describe("EPIC-104 checkout web redirect", () => {
  it("issues and verifies one-time checkout handoff token", async () => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret-32chars-minimum!!";
    const token = await issueCheckoutHandoffToken("user-test-1");
    const userId = await verifyCheckoutHandoffToken(token);
    expect(userId).toBe("user-test-1");
    const replay = await verifyCheckoutHandoffToken(token);
    expect(replay).toBeNull();
  });
});
