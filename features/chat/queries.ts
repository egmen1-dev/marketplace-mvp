import {
  ConversationStatus,
  MessageType,
  Prisma,
  type UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { toPriceNumber } from "@/features/products/mappers";

export type ChatParticipant = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export type ChatProductSummary = {
  id: string;
  title: string;
  price: number;
  currency: string;
  imageUrl: string | null;
};

export type ChatMessageDto = {
  id: string;
  conversationId: string;
  text: string;
  type: MessageType;
  isRead: boolean;
  createdAt: string;
  senderId: string | null;
  sender: ChatParticipant | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
};

export type ConversationListItem = {
  id: string;
  status: ConversationStatus;
  updatedAt: string;
  createdAt: string;
  unreadCount: number;
  product: ChatProductSummary;
  counterpart: {
    name: string;
    kind: "buyer" | "seller";
  };
  lastMessage: {
    text: string;
    type: MessageType;
    createdAt: string;
    senderId: string | null;
  } | null;
};

/** Admin moderation inbox row — shows both parties. */
export type AdminConversationListItem = ConversationListItem & {
  buyerLabel: string;
  sellerLabel: string;
};

export type ConversationDetail = {
  id: string;
  status: ConversationStatus;
  product: ChatProductSummary;
  buyer: ChatParticipant;
  seller: {
    id: string;
    storeName: string;
    slug: string;
    user: ChatParticipant;
  };
  messages: ChatMessageDto[];
};

const productSelect = {
  id: true,
  name: true,
  price: true,
  currency: true,
  images: {
    where: { isPrimary: true },
    take: 1,
    select: { url: true },
    orderBy: { sortOrder: "asc" as const },
  },
} satisfies Prisma.ProductSelect;

function mapProduct(row: {
  id: string;
  name: string;
  price: Prisma.Decimal | number;
  currency: string;
  images: { url: string }[];
}): ChatProductSummary {
  return {
    id: row.id,
    title: row.name,
    price: toPriceNumber(row.price),
    currency: row.currency,
    imageUrl: row.images[0]?.url ?? null,
  };
}

function mapParticipant(row: {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}): ChatParticipant {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
  };
}

function mapMessage(row: {
  id: string;
  conversationId: string;
  text: string;
  type: MessageType;
  isRead: boolean;
  createdAt: Date;
  senderId: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  sender: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}): ChatMessageDto {
  return {
    id: row.id,
    conversationId: row.conversationId,
    text: row.text,
    type: row.type,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
    senderId: row.senderId,
    sender: row.sender ? mapParticipant(row.sender) : null,
    attachmentUrl: row.attachmentUrl,
    attachmentName: row.attachmentName,
    attachmentMime: row.attachmentMime,
  };
}

export class ChatError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "OWN_PRODUCT"
      | "INVALID"
      | "CLOSED" = "INVALID",
  ) {
    super(message);
    this.name = "ChatError";
  }
}

/** Resolve whether viewer can access conversation (buyer, seller user, or admin). */
export async function assertConversationAccess(
  conversationId: string,
  viewer: { id: string; role: UserRole; sellerProfileId: string | null },
) {
  const row = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      status: true,
      seller: { select: { userId: true } },
    },
  });
  if (!row) throw new ChatError("Диалог не найден", "NOT_FOUND");

  const isBuyer = row.buyerId === viewer.id;
  const isSeller = row.seller.userId === viewer.id;
  const isAdmin = viewer.role === "ADMIN";
  if (!isBuyer && !isSeller && !isAdmin) {
    throw new ChatError("Нет доступа к диалогу", "FORBIDDEN");
  }
  return { ...row, isBuyer, isSeller, isAdmin };
}

export async function getOrCreateConversationForProduct(opts: {
  productId: string;
  buyerId: string;
}): Promise<{ conversationId: string; created: boolean }> {
  const product = await prisma.product.findUnique({
    where: { id: opts.productId },
    select: {
      id: true,
      status: true,
      sellerId: true,
      seller: { select: { userId: true, isBlocked: true } },
    },
  });
  if (!product || product.status !== "ACTIVE" || product.seller.isBlocked) {
    throw new ChatError("Товар недоступен", "NOT_FOUND");
  }
  if (product.seller.userId === opts.buyerId) {
    throw new ChatError("Нельзя писать себе", "OWN_PRODUCT");
  }

  const existing = await prisma.conversation.findUnique({
    where: {
      productId_buyerId: {
        productId: opts.productId,
        buyerId: opts.buyerId,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return { conversationId: existing.id, created: false };
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          productId: opts.productId,
          buyerId: opts.buyerId,
          sellerId: product.sellerId,
          status: ConversationStatus.ACTIVE,
        },
      });
      await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: null,
          text: "Вы можете написать продавцу.",
          type: MessageType.SYSTEM,
          isRead: true,
        },
      });
      return conversation;
    });
    return { conversationId: created.id, created: true };
  } catch (err) {
    // Concurrent "Написать продавцу" — unique(productId, buyerId)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const again = await prisma.conversation.findUnique({
        where: {
          productId_buyerId: {
            productId: opts.productId,
            buyerId: opts.buyerId,
          },
        },
        select: { id: true },
      });
      if (again) return { conversationId: again.id, created: false };
    }
    throw err;
  }
}

export async function listAllConversationsForAdmin(opts?: {
  limit?: number;
}): Promise<AdminConversationListItem[]> {
  const limit = Math.min(opts?.limit ?? 100, 200);
  const rows = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      product: { select: productSelect },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, storeName: true, userId: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          text: true,
          type: true,
          createdAt: true,
          senderId: true,
        },
      },
    },
  });

  return rows.map((row) => {
    const last = row.messages[0] ?? null;
    const buyerLabel = row.buyer.name ?? row.buyer.email;
    return {
      id: row.id,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      unreadCount: 0,
      product: mapProduct(row.product),
      counterpart: {
        name: `${buyerLabel} ↔ ${row.seller.storeName}`,
        kind: "buyer" as const,
      },
      buyerLabel,
      sellerLabel: row.seller.storeName,
      lastMessage: last
        ? {
            text: last.text,
            type: last.type,
            createdAt: last.createdAt.toISOString(),
            senderId: last.senderId,
          }
        : null,
    };
  });
}

export async function listConversationsForUser(opts: {
  userId: string;
  /** Ignored for auth — seller id is always resolved from DB for userId. */
  sellerProfileId?: string | null;
}): Promise<ConversationListItem[]> {
  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: opts.userId },
    select: { id: true },
  });
  const sellerProfileId = sellerProfile?.id ?? null;

  const where: Prisma.ConversationWhereInput = {
    OR: [
      { buyerId: opts.userId },
      ...(sellerProfileId ? [{ sellerId: sellerProfileId }] : []),
    ],
  };

  const rows = await prisma.conversation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      product: { select: productSelect },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, storeName: true, userId: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          text: true,
          type: true,
          createdAt: true,
          senderId: true,
        },
      },
    },
  });

  const unreadCounts = await Promise.all(
    rows.map(async (row) =>
      prisma.message.count({
        where: {
          conversationId: row.id,
          isRead: false,
          NOT: { senderId: opts.userId },
        },
      }),
    ),
  );

  return rows.map((row, i) => {
    const isBuyerView = row.buyerId === opts.userId;
    const last = row.messages[0] ?? null;
    return {
      id: row.id,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      unreadCount: unreadCounts[i] ?? 0,
      product: mapProduct(row.product),
      counterpart: isBuyerView
        ? { name: row.seller.storeName, kind: "seller" as const }
        : {
            name: row.buyer.name ?? row.buyer.email,
            kind: "buyer" as const,
          },
      lastMessage: last
        ? {
            text: last.text,
            type: last.type,
            createdAt: last.createdAt.toISOString(),
            senderId: last.senderId,
          }
        : null,
    };
  });
}

export async function countUnreadMessagesForUser(opts: {
  userId: string;
  /** Ignored for auth — seller id is always resolved from DB for userId. */
  sellerProfileId?: string | null;
}): Promise<number> {
  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: opts.userId },
    select: { id: true },
  });
  const sellerProfileId = sellerProfile?.id ?? null;

  const conversationIds = await prisma.conversation.findMany({
    where: {
      OR: [
        { buyerId: opts.userId },
        ...(sellerProfileId ? [{ sellerId: sellerProfileId }] : []),
      ],
    },
    select: { id: true },
  });
  if (conversationIds.length === 0) return 0;

  return prisma.message.count({
    where: {
      conversationId: { in: conversationIds.map((c) => c.id) },
      isRead: false,
      NOT: { senderId: opts.userId },
      // SYSTEM messages are created as isRead=true
    },
  });
}

export async function getConversationDetail(opts: {
  conversationId: string;
  viewer: { id: string; role: UserRole; sellerProfileId: string | null };
}): Promise<ConversationDetail> {
  const access = await assertConversationAccess(
    opts.conversationId,
    opts.viewer,
  );

  if (access.isAdmin && !access.isBuyer && !access.isSeller) {
    log.info("admin_chat_view", {
      adminId: opts.viewer.id,
      conversationId: opts.conversationId,
    });
  }

  const row = await prisma.conversation.findUniqueOrThrow({
    where: { id: opts.conversationId },
    include: {
      product: { select: productSelect },
      buyer: {
        select: { id: true, name: true, email: true, image: true },
      },
      seller: {
        select: {
          id: true,
          storeName: true,
          slug: true,
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
    },
  });

  // Only participants mark counterpart messages read — never admin-only viewers
  if (access.isBuyer || access.isSeller) {
    await prisma.message.updateMany({
      where: {
        conversationId: row.id,
        isRead: false,
        NOT: { senderId: opts.viewer.id },
      },
      data: { isRead: true },
    });
  }

  return {
    id: row.id,
    status: row.status,
    product: mapProduct(row.product),
    buyer: mapParticipant(row.buyer),
    seller: {
      id: row.seller.id,
      storeName: row.seller.storeName,
      slug: row.seller.slug,
      user: mapParticipant(row.seller.user),
    },
    messages: row.messages.map(mapMessage),
  };
}

export async function sendTextMessage(opts: {
  conversationId: string;
  senderId: string;
  text: string;
  viewer: { id: string; role: UserRole; sellerProfileId: string | null };
}): Promise<ChatMessageDto> {
  const access = await assertConversationAccess(
    opts.conversationId,
    opts.viewer,
  );
  if (opts.senderId !== opts.viewer.id) {
    throw new ChatError("Нельзя отправить от чужого имени", "FORBIDDEN");
  }
  if (!access.isBuyer && !access.isSeller) {
    throw new ChatError("Только участники диалога могут писать", "FORBIDDEN");
  }
  if (access.status === ConversationStatus.CLOSED) {
    throw new ChatError("Диалог закрыт", "CLOSED");
  }
  if (access.status === ConversationStatus.ARCHIVED) {
    throw new ChatError("Диалог в архиве", "CLOSED");
  }

  const text = opts.text.trim();
  if (!text) throw new ChatError("Введите сообщение", "INVALID");

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId: opts.conversationId,
        senderId: opts.senderId,
        text,
        type: MessageType.TEXT,
        isRead: false,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
    await tx.conversation.update({
      where: { id: opts.conversationId },
      data: { updatedAt: new Date() },
    });
    return created;
  });

  return mapMessage(message);
}

/** Append a system / typed message to an existing conversation (or skip if none). */
export async function postSystemMessageToConversation(opts: {
  conversationId: string;
  text: string;
  type?: MessageType;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.message.create({
      data: {
        conversationId: opts.conversationId,
        senderId: null,
        text: opts.text,
        type: opts.type ?? MessageType.SYSTEM,
        isRead: true,
      },
    });
    await tx.conversation.update({
      where: { id: opts.conversationId },
      data: { updatedAt: new Date() },
    });
  });
}

/**
 * Post order system message into buyer↔seller chats for products in the order.
 * Creates conversation if missing (without "Диалог создан." — uses ORDER text).
 */
export async function notifyOrderCreated(opts: {
  buyerId: string;
  orderId: string;
  orderNumber: string;
}): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    select: {
      items: {
        select: {
          productName: true,
          quantity: true,
        },
        take: 3,
      },
    },
  });

  const lines = [`Создан новый заказ #${opts.orderNumber}`];
  if (order?.items.length) {
    const primary = order.items[0];
    lines.push(`Товар:\n${primary.productName}`);
    lines.push(`Количество:\n${primary.quantity}`);
    if (order.items.length > 1) {
      lines.push(`И ещё ${order.items.length - 1} поз.`);
    }
  }

  await notifyOrderLifecycleMessage({
    orderId: opts.orderId,
    body: lines.join("\n\n"),
  });
}

/** System ORDER message for any lifecycle transition (one thread per product line). */
export async function notifyOrderLifecycleMessage(opts: {
  orderId: string;
  body: string;
}): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    select: {
      userId: true,
      items: {
        select: {
          productId: true,
          product: {
            select: { sellerId: true, seller: { select: { userId: true } } },
          },
        },
      },
    },
  });
  if (!order) return;

  const byProduct = new Map<
    string,
    { productId: string; sellerId: string }
  >();
  for (const item of order.items) {
    if (!item.productId || !item.product) continue;
    if (item.product.seller.userId === order.userId) continue;
    byProduct.set(item.productId, {
      productId: item.productId,
      sellerId: item.product.sellerId,
    });
  }

  for (const entry of byProduct.values()) {
    await upsertConversationSystemMessage({
      productId: entry.productId,
      buyerId: order.userId,
      sellerId: entry.sellerId,
      text: opts.body,
      type: MessageType.ORDER,
    });
  }
}

export async function notifyReservationCreated(opts: {
  buyerId: string;
  productId: string;
  sellerId: string;
}): Promise<void> {
  await upsertConversationSystemMessage({
    productId: opts.productId,
    buyerId: opts.buyerId,
    sellerId: opts.sellerId,
    text: "Создана бронь товара",
    type: MessageType.RESERVATION,
  });
}

export async function notifyReservationConfirmed(opts: {
  reservationId: string;
}): Promise<void> {
  await notifyReservationStatusMessage(
    opts.reservationId,
    "Продавец подтвердил бронь",
  );
}

export async function notifyReservationReady(opts: {
  reservationId: string;
}): Promise<void> {
  await notifyReservationStatusMessage(
    opts.reservationId,
    "Товар подготовлен к выдаче",
  );
}

export async function notifyReservationCompleted(opts: {
  reservationId: string;
}): Promise<void> {
  await notifyReservationStatusMessage(
    opts.reservationId,
    "Товар получен",
  );
}

export async function notifyReservationCancelled(opts: {
  reservationId: string;
}): Promise<void> {
  await notifyReservationStatusMessage(
    opts.reservationId,
    "Бронь отменена",
  );
}

async function notifyReservationStatusMessage(
  reservationId: string,
  text: string,
): Promise<void> {
  const row = await prisma.pickupReservation.findUnique({
    where: { id: reservationId },
    select: {
      buyerId: true,
      productId: true,
      sellerId: true,
    },
  });
  if (!row) return;
  await upsertConversationSystemMessage({
    productId: row.productId,
    buyerId: row.buyerId,
    sellerId: row.sellerId,
    text,
    type: MessageType.RESERVATION,
  });
}

async function upsertConversationSystemMessage(opts: {
  productId: string;
  buyerId: string;
  sellerId: string;
  text: string;
  type: MessageType;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    let conversation = await tx.conversation.findUnique({
      where: {
        productId_buyerId: {
          productId: opts.productId,
          buyerId: opts.buyerId,
        },
      },
      select: { id: true },
    });
    if (!conversation) {
      conversation = await tx.conversation.create({
        data: {
          productId: opts.productId,
          buyerId: opts.buyerId,
          sellerId: opts.sellerId,
          status: ConversationStatus.ACTIVE,
        },
        select: { id: true },
      });
      await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: null,
          text: "Диалог создан.",
          type: MessageType.SYSTEM,
          isRead: true,
        },
      });
    }

    // Idempotent: skip duplicate system/ORDER/RESERVATION text (double-click / retry).
    const last = await tx.message.findFirst({
      where: {
        conversationId: conversation.id,
        type: opts.type,
        text: opts.text,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });
    if (last && Date.now() - last.createdAt.getTime() < 10 * 60 * 1000) {
      return;
    }

    await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: null,
        text: opts.text,
        type: opts.type,
        isRead: true,
      },
    });
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
  });
}

/** Admin: close conversation (soft). Hard delete is not used in product UI. */
export async function adminDeleteConversation(
  conversationId: string,
  adminId?: string,
): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: ConversationStatus.CLOSED },
  });
  if (adminId) {
    log.info("admin_chat_close", { adminId, conversationId });
  }
}

/** Paginated message history for mobile API (does not mark read). */
export async function listMessagesPaginated(opts: {
  conversationId: string;
  viewer: { id: string; role: UserRole; sellerProfileId: string | null };
  cursor?: string | null;
  limit?: number;
}): Promise<{ items: ChatMessageDto[]; nextCursor: string | null; hasMore: boolean }> {
  await assertConversationAccess(opts.conversationId, opts.viewer);
  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 100);

  const rows = await prisma.message.findMany({
    where: {
      conversationId: opts.conversationId,
      ...(opts.cursor ? { createdAt: { lt: new Date(opts.cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: {
      sender: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const oldestInPage = slice[slice.length - 1];
  const items = [...slice].reverse().map(mapMessage);
  const nextCursor = hasMore ? oldestInPage?.createdAt.toISOString() ?? null : null;

  return { items, nextCursor, hasMore };
}

/** Mark counterpart messages as read for a participant. */
export async function markConversationMessagesRead(opts: {
  conversationId: string;
  viewer: { id: string; role: UserRole; sellerProfileId: string | null };
}): Promise<{ unreadCount: number }> {
  const access = await assertConversationAccess(opts.conversationId, opts.viewer);
  if (!access.isBuyer && !access.isSeller) {
    throw new ChatError("Нет доступа к диалогу", "FORBIDDEN");
  }

  await prisma.message.updateMany({
    where: {
      conversationId: opts.conversationId,
      isRead: false,
      NOT: { senderId: opts.viewer.id },
    },
    data: { isRead: true },
  });

  return { unreadCount: await countUnreadMessagesForUser({ userId: opts.viewer.id }) };
}
