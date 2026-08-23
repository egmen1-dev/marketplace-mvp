import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const unreadHook = readFileSync("apps/mobile/src/hooks/useMessagesBadge.ts", "utf8");
const badgesSource = readFileSync("apps/mobile/src/commerce/refresh-tab-badges.ts", "utf8");
const headerSource = readFileSync("apps/mobile/src/components/CommerceHeader.tsx", "utf8");
const unreadRoute = readFileSync("app/api/mobile/conversations/unread/route.ts", "utf8");

describe("mobile chat unread badge", () => {
  it("uses dedicated unread endpoint", () => {
    expect(unreadRoute).toContain("countUnreadMessagesForUser");
    expect(badgesSource).toContain("fetchConversationsUnread");
  });

  it("refreshes on focus and app foreground without polling interval", () => {
    expect(unreadHook).toContain("useFocusEffect");
    expect(unreadHook).toContain("AppState");
    expect(unreadHook).not.toMatch(/setInterval/);
  });

  it("header badge hides at zero", () => {
    expect(headerSource).toContain("badge && badge > 0");
  });
});
