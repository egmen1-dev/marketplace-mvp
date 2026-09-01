import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const endpointsSource = readFileSync("apps/mobile/src/api/endpoints.ts", "utf8");
const inboxSource = readFileSync("apps/mobile/app/messages/index.tsx", "utf8");
const threadSource = readFileSync("apps/mobile/app/messages/[conversationId].tsx", "utf8");
const profileSource = readFileSync("apps/mobile/src/components/ProfileMenu.tsx", "utf8");
const productSource = readFileSync("apps/mobile/app/product/[id].tsx", "utf8");
const chatActionsSource = readFileSync("apps/mobile/src/hooks/useChatActions.ts", "utf8");
const apiRoutes = [
  "app/api/mobile/conversations/route.ts",
  "app/api/mobile/conversations/unread/route.ts",
  "app/api/mobile/conversations/[id]/route.ts",
  "app/api/mobile/conversations/[id]/messages/route.ts",
  "app/api/mobile/conversations/[id]/read/route.ts",
].map((p) => readFileSync(p, "utf8"));

describe("mobile chat wiring", () => {
  it("defines mobile conversation API client methods", () => {
    expect(endpointsSource).toContain("/api/mobile/conversations");
    expect(endpointsSource).toContain("sendConversationMessage");
    expect(endpointsSource).toContain("markConversationRead");
  });

  it("mobile API routes reuse existing chat queries (no parallel backend)", () => {
    for (const src of apiRoutes) {
      expect(src).toContain("features/chat");
    }
    expect(apiRoutes[0]).toContain("getOrCreateConversationForProduct");
    expect(apiRoutes[0]).toContain("listConversationsForUser");
  });

  it("inbox and thread screens exist with Russian empty state", () => {
    expect(inboxSource).toContain("Сообщений пока нет");
    expect(threadSource).toContain("Введите сообщение");
    expect(threadSource).toContain("sendConversationMessage");
  });

  it("profile menu exposes messages entry", () => {
    expect(profileSource).toContain('router.push("/messages")');
    expect(profileSource).toContain("messagesBadge");
  });

  it("PDP has write seller CTA wired to conversation flow", () => {
    const sellerCardSource = readFileSync("apps/mobile/src/product/ui/ProductSellerCard.tsx", "utf8");
    expect(sellerCardSource).toContain("Написать продавцу");
    expect(productSource).toContain("openProductConversation");
    expect(chatActionsSource).toContain("createConversation");
  });
});
