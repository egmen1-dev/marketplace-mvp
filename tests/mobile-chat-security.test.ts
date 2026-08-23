import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  ChatError,
  assertConversationAccess,
  getOrCreateConversationForProduct,
  listMessagesPaginated,
  markConversationMessagesRead,
  sendTextMessage,
} from "@/features/chat/queries";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("mobile chat security", () => {
  it("rejects outsider from conversation access", async () => {
    const buyer = await prisma.user.findUniqueOrThrow({ where: { email: "buyer@demo.lot" } });
    const outsider = await prisma.user.findUniqueOrThrow({ where: { email: "toolspro@demo.lot" } });
    const product = await prisma.product.findFirstOrThrow({
      where: { status: "ACTIVE", seller: { user: { email: "seller@demo.lot" } } },
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
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks spoofed senderId on sendTextMessage", async () => {
    const buyer = await prisma.user.findUniqueOrThrow({ where: { email: "buyer@demo.lot" } });
    const outsider = await prisma.user.findUniqueOrThrow({ where: { email: "toolspro@demo.lot" } });
    const product = await prisma.product.findFirstOrThrow({
      where: { status: "ACTIVE", seller: { user: { email: "seller@demo.lot" } } },
      select: { id: true },
    });

    const { conversationId } = await getOrCreateConversationForProduct({
      productId: product.id,
      buyerId: buyer.id,
    });

    await expect(
      sendTextMessage({
        conversationId,
        senderId: buyer.id,
        text: "spoof",
        viewer: { id: outsider.id, role: "SELLER", sellerProfileId: null },
      }),
    ).rejects.toBeInstanceOf(ChatError);
  });

  it("mark read requires participant access", async () => {
    const buyer = await prisma.user.findUniqueOrThrow({ where: { email: "buyer@demo.lot" } });
    const outsider = await prisma.user.findUniqueOrThrow({ where: { email: "toolspro@demo.lot" } });
    const product = await prisma.product.findFirstOrThrow({
      where: { status: "ACTIVE", seller: { user: { email: "seller@demo.lot" } } },
      select: { id: true },
    });

    const { conversationId } = await getOrCreateConversationForProduct({
      productId: product.id,
      buyerId: buyer.id,
    });

    await expect(
      markConversationMessagesRead({
        conversationId,
        viewer: { id: outsider.id, role: "SELLER", sellerProfileId: null },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("paginated messages require access", async () => {
    const buyer = await prisma.user.findUniqueOrThrow({ where: { email: "buyer@demo.lot" } });
    const outsider = await prisma.user.findUniqueOrThrow({ where: { email: "toolspro@demo.lot" } });
    const product = await prisma.product.findFirstOrThrow({
      where: { status: "ACTIVE", seller: { user: { email: "seller@demo.lot" } } },
      select: { id: true },
    });

    const { conversationId } = await getOrCreateConversationForProduct({
      productId: product.id,
      buyerId: buyer.id,
    });

    await expect(
      listMessagesPaginated({
        conversationId,
        viewer: { id: outsider.id, role: "SELLER", sellerProfileId: null },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
