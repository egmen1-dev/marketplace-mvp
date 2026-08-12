import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  ChatError,
  adminListConversations,
  assertConversationAccess,
  getConversationDetail,
  getOrCreateConversationForProduct,
  sendTextMessage,
} from "@/features/chat/queries";

describe("chat access control", () => {
  it("rejects non-participant and blocks spoofed senderId", async () => {
    const buyer = await prisma.user.findUniqueOrThrow({
      where: { email: "buyer@demo.lot" },
    });
    const outsider = await prisma.user.findUniqueOrThrow({
      where: { email: "toolspro@demo.lot" },
    });
    const product = await prisma.product.findFirstOrThrow({
      where: {
        status: "ACTIVE",
        seller: { user: { email: "seller@demo.lot" } },
      },
      select: { id: true },
    });

    const { conversationId } = await getOrCreateConversationForProduct({
      productId: product.id,
      buyerId: buyer.id,
    });

    await expect(
      assertConversationAccess(conversationId, {
        id: outsider.id,
        role: "SELLER",
        sellerProfileId: null,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<ChatError>);

    await expect(
      sendTextMessage({
        conversationId,
        senderId: buyer.id,
        text: "spoof attempt",
        viewer: {
          id: outsider.id,
          role: "SELLER",
          sellerProfileId: null,
        },
      }),
    ).rejects.toBeInstanceOf(ChatError);

    await expect(
      sendTextMessage({
        conversationId,
        senderId: outsider.id,
        text: "admin-ish send",
        viewer: {
          id: outsider.id,
          role: "ADMIN",
          sellerProfileId: null,
        },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("grants admin read-only access without mutating unread state", async () => {
    const buyer = await prisma.user.findUniqueOrThrow({
      where: { email: "buyer@demo.lot" },
    });
    const admin = await prisma.user.findFirstOrThrow({
      where: { role: "ADMIN" },
    });
    const product = await prisma.product.findFirstOrThrow({
      where: {
        status: "ACTIVE",
        seller: { user: { email: "seller@demo.lot" } },
      },
      select: { id: true, sellerId: true },
    });

    const { conversationId } = await getOrCreateConversationForProduct({
      productId: product.id,
      buyerId: buyer.id,
    });

    // Buyer writes so there is an unread message from the buyer's side.
    await sendTextMessage({
      conversationId,
      senderId: buyer.id,
      text: "Здравствуйте, товар в наличии?",
      viewer: { id: buyer.id, role: "BUYER", sellerProfileId: null },
    });

    const unreadBefore = await prisma.message.count({
      where: { conversationId, isRead: false, NOT: { senderId: buyer.id } },
    });

    // Admin can resolve access and read the thread.
    const access = await assertConversationAccess(conversationId, {
      id: admin.id,
      role: "ADMIN",
      sellerProfileId: null,
    });
    expect(access.isAdmin).toBe(true);

    const detail = await getConversationDetail({
      conversationId,
      viewer: { id: admin.id, role: "ADMIN", sellerProfileId: null },
    });
    expect(detail.id).toBe(conversationId);
    expect(detail.messages.length).toBeGreaterThan(0);

    // Admin viewing must NOT mark buyer messages as read.
    const unreadAfter = await prisma.message.count({
      where: { conversationId, isRead: false, NOT: { senderId: buyer.id } },
    });
    expect(unreadAfter).toBe(unreadBefore);

    // Admin appears in the support browse list.
    const list = await adminListConversations({ take: 100 });
    expect(list.items.some((c) => c.id === conversationId)).toBe(true);
  });

  it("reuses unique product+buyer conversation", async () => {
    const buyer = await prisma.user.findUniqueOrThrow({
      where: { email: "buyer@demo.lot" },
    });
    const product = await prisma.product.findFirstOrThrow({
      where: {
        status: "ACTIVE",
        seller: { user: { email: "seller@demo.lot" } },
      },
      select: { id: true },
    });

    const a = await getOrCreateConversationForProduct({
      productId: product.id,
      buyerId: buyer.id,
    });
    const b = await getOrCreateConversationForProduct({
      productId: product.id,
      buyerId: buyer.id,
    });
    expect(a.conversationId).toBe(b.conversationId);
    expect(b.created).toBe(false);
  });
});
