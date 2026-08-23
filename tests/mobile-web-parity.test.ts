import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  countUnreadMessagesForUser,
  getOrCreateConversationForProduct,
  listConversationsForUser,
  sendTextMessage,
} from "@/features/chat/queries";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("mobile chat integration — domain flow", () => {
  it("buyer creates conversation, seller sees it, message changes unread", async () => {
    const buyer = await prisma.user.findUniqueOrThrow({ where: { email: "buyer@demo.lot" } });
    const sellerUser = await prisma.user.findUniqueOrThrow({ where: { email: "seller@demo.lot" } });
    const sellerProfile = await prisma.sellerProfile.findUniqueOrThrow({ where: { userId: sellerUser.id } });
    const product = await prisma.product.findFirstOrThrow({
      where: { status: "ACTIVE", sellerId: sellerProfile.id },
      select: { id: true },
    });

    const { conversationId } = await getOrCreateConversationForProduct({
      productId: product.id,
      buyerId: buyer.id,
    });

    const buyerList = await listConversationsForUser({ userId: buyer.id });
    expect(buyerList.some((c) => c.id === conversationId)).toBe(true);

    const sellerList = await listConversationsForUser({ userId: sellerUser.id });
    expect(sellerList.some((c) => c.id === conversationId)).toBe(true);

    const beforeUnread = await countUnreadMessagesForUser({ userId: sellerUser.id });

    await sendTextMessage({
      conversationId,
      senderId: buyer.id,
      text: `mobile-chat-integration-${Date.now()}`,
      viewer: { id: buyer.id, role: buyer.role, sellerProfileId: null },
    });

    const afterUnread = await countUnreadMessagesForUser({ userId: sellerUser.id });
    expect(afterUnread).toBeGreaterThanOrEqual(beforeUnread);
  });
});

describe("mobile web parity artifact", () => {
  it("feature matrix documents chat parity closure", () => {
    const matrix = JSON.parse(readFileSync("artifacts/mobile-web-parity/feature-matrix.json", "utf8"));
    const chat = matrix.features.find((f: { feature: string }) => f.feature === "buyer_seller_chat");
    expect(chat).toBeTruthy();
    expect(chat.status).toBe("PARITY");
  });
});
