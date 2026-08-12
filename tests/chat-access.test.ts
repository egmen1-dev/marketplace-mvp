import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  ChatError,
  assertConversationAccess,
  getConversationDetail,
  getOrCreateConversationForProduct,
  listAllConversationsForAdmin,
  sendTextMessage,
} from "@/features/chat/queries";

describe("chat access control", () => {
  it("allows admin read access to any conversation", async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: "admin@demo.lot" },
    });
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

    const { conversationId } = await getOrCreateConversationForProduct({
      productId: product.id,
      buyerId: buyer.id,
    });

    await expect(
      assertConversationAccess(conversationId, {
        id: admin.id,
        role: "ADMIN",
        sellerProfileId: null,
      }),
    ).resolves.toMatchObject({ isAdmin: true });

    const detail = await getConversationDetail({
      conversationId,
      viewer: {
        id: admin.id,
        role: "ADMIN",
        sellerProfileId: null,
      },
    });
    expect(detail.messages.length).toBeGreaterThan(0);
  });

  it("admin inbox lists conversations globally", async () => {
    const rows = await listAllConversationsForAdmin({ limit: 5 });
    expect(Array.isArray(rows)).toBe(true);
    if (rows[0]) {
      expect(rows[0].buyerLabel).toBeTruthy();
      expect(rows[0].sellerLabel).toBeTruthy();
    }
  });

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
