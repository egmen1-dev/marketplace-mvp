import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  ChatError,
  assertConversationAccess,
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
