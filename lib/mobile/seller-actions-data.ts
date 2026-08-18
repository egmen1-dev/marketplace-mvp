import { OrderStatus, ProductStatus } from "@prisma/client";

import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { setInventoryQuantity } from "@/features/orders/lib/inventory-sync";
import { ProductServiceError, updateProduct } from "@/features/products/queries";
import { SellerServiceError, updateSellerOrderStatus, updateSellerSettings } from "@/features/seller/queries";
import { conversationPath, ROUTES } from "@/lib/constants";
import { listSellerPaymentMethods } from "@/lib/seller-payout/methods";
import { createPayoutRequest, validatePayoutAmount } from "@/lib/seller-payout/requests";
import { isSellerPayoutEnabled } from "@/lib/seller-payout/flags";
import { prisma } from "@/lib/prisma";

import type { SellerActionKind } from "./seller-home";

export type MobileSellerActionPayload = Record<string, string | number | boolean | null>;

export type MobileSellerActionUndo = {
  action: SellerActionKind;
  payload: MobileSellerActionPayload;
};

export type MobileSellerActionResult = {
  ok: boolean;
  action: SellerActionKind;
  message: string;
  errorCode?: string;
  openUrl?: string | null;
  undo?: MobileSellerActionUndo | null;
};

export type MobileSellerActionRequest = {
  action: SellerActionKind;
  payload: MobileSellerActionPayload;
};

function fail(action: SellerActionKind, message: string, errorCode?: string): MobileSellerActionResult {
  return { ok: false, action, message, errorCode: errorCode ?? "ACTION_FAILED" };
}

function okResult(
  action: SellerActionKind,
  message: string,
  extra?: Partial<MobileSellerActionResult>,
): MobileSellerActionResult {
  return { ok: true, action, message, openUrl: null, undo: null, ...extra };
}

async function requireSeller(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return null;
  }
  return { user, sellerProfileId: user.sellerProfileId };
}

async function handleUpdateStock(
  sellerProfileId: string,
  userId: string,
  payload: MobileSellerActionPayload,
): Promise<MobileSellerActionResult> {
  const productId = String(payload.productId ?? "");
  const quantity = Number(payload.quantity);
  if (!productId || !Number.isFinite(quantity) || quantity < 0) {
    return fail("update_stock", "Укажите корректный остаток");
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, sellerId: true, stock: true },
  });
  if (!product || product.sellerId !== sellerProfileId) {
    return fail("update_stock", "Товар не найден", "NOT_FOUND");
  }

  const previousQuantity = product.stock ?? 0;
  const qty = Math.floor(quantity);

  try {
    await prisma.$transaction(async (tx) => {
      await setInventoryQuantity(tx, {
        productId,
        quantity: qty,
        actorUserId: userId,
        note: "Обновление остатка из Seller Action Center",
      });
    });
  } catch {
    return fail("update_stock", "Не удалось обновить остаток");
  }

  return okResult("update_stock", "Остаток обновлён", {
    undo: { action: "update_stock", payload: { productId, quantity: previousQuantity } },
  });
}

async function handlePublishProduct(
  sellerProfileId: string,
  payload: MobileSellerActionPayload,
): Promise<MobileSellerActionResult> {
  const productId = String(payload.productId ?? "");
  if (!productId) return fail("publish_product", "Товар не указан");

  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, sellerId: true, status: true, name: true },
  });
  if (!existing || existing.sellerId !== sellerProfileId) {
    return fail("publish_product", "Товар не найден", "NOT_FOUND");
  }
  if (existing.status !== ProductStatus.DRAFT) {
    return fail("publish_product", "Публикация доступна только для черновиков");
  }

  try {
    await updateProduct(productId, sellerProfileId, { status: ProductStatus.ACTIVE });
  } catch (err) {
    const message = err instanceof ProductServiceError ? err.message : "Не удалось опубликовать товар";
    return fail("publish_product", message, err instanceof ProductServiceError ? err.code : undefined);
  }

  return okResult("publish_product", "Товар опубликован", {
    undo: { action: "publish_product", payload: { productId, revertStatus: "DRAFT" } },
  });
}

async function handleResumeDraft(
  sellerProfileId: string,
  payload: MobileSellerActionPayload,
): Promise<MobileSellerActionResult> {
  const productId = String(payload.productId ?? "");
  if (!productId) return fail("resume_draft", "Черновик не указан");
  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId: sellerProfileId, status: ProductStatus.DRAFT },
    select: { id: true },
  });
  if (!product) return fail("resume_draft", "Черновик не найден", "NOT_FOUND");

  return okResult("resume_draft", "Откройте карточку для продолжения", {
    openUrl: `${ROUTES.SELLER_PRODUCTS}/${productId}/edit`,
  });
}

async function handleFixModeration(
  sellerProfileId: string,
  payload: MobileSellerActionPayload,
): Promise<MobileSellerActionResult> {
  const productId = String(payload.productId ?? "");
  if (!productId) return fail("fix_moderation", "Товар не указан");
  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId: sellerProfileId },
    select: { id: true },
  });
  if (!product) return fail("fix_moderation", "Товар не найден", "NOT_FOUND");

  return okResult("fix_moderation", "Откройте карточку для исправлений", {
    openUrl: `${ROUTES.SELLER_PRODUCTS}/${productId}/edit`,
  });
}

async function handleShipOrder(
  sellerProfileId: string,
  userId: string,
  role: import("@prisma/client").UserRole,
  payload: MobileSellerActionPayload,
): Promise<MobileSellerActionResult> {
  const orderId = String(payload.orderId ?? "");
  if (!orderId) return fail("ship_order", "Заказ не указан");

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      items: { some: { product: { sellerId: sellerProfileId } } },
    },
    select: { id: true, status: true },
  });
  if (!order) return fail("ship_order", "Заказ не найден", "NOT_FOUND");

  const previousStatus = order.status;
  try {
    await updateSellerOrderStatus({
      orderId,
      toStatus: OrderStatus.SHIPPED,
      actorUserId: userId,
      actorRole: role,
      sellerProfileId,
    });
  } catch (err) {
    const message = err instanceof SellerServiceError ? err.message : "Не удалось отметить отправку";
    return fail("ship_order", message);
  }

  return okResult("ship_order", "Заказ отмечен как отправленный", {
    undo: { action: "ship_order", payload: { orderId, revertStatus: previousStatus } },
  });
}

async function handleConfirmOrder(
  sellerProfileId: string,
  userId: string,
  role: import("@prisma/client").UserRole,
  payload: MobileSellerActionPayload,
): Promise<MobileSellerActionResult> {
  const orderId = String(payload.orderId ?? "");
  if (!orderId) return fail("confirm_order", "Заказ не указан");

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      items: { some: { product: { sellerId: sellerProfileId } } },
    },
    select: { id: true, status: true },
  });
  if (!order) return fail("confirm_order", "Заказ не найден", "NOT_FOUND");

  const nextStatus =
    order.status === OrderStatus.PAID || order.status === OrderStatus.NEW
      ? OrderStatus.PROCESSING
      : order.status === OrderStatus.AWAITING_SELLER_CONFIRMATION
        ? OrderStatus.CONFIRMED
        : OrderStatus.PROCESSING;

  try {
    await updateSellerOrderStatus({
      orderId,
      toStatus: nextStatus,
      actorUserId: userId,
      actorRole: role,
      sellerProfileId,
    });
  } catch (err) {
    const message = err instanceof SellerServiceError ? err.message : "Не удалось обновить заказ";
    return fail("confirm_order", message);
  }

  return okResult("confirm_order", "Заказ принят в работу", {
    undo: { action: "confirm_order", payload: { orderId, revertStatus: order.status } },
  });
}

async function handleReplyBuyer(payload: MobileSellerActionPayload): Promise<MobileSellerActionResult> {
  const conversationId = String(payload.conversationId ?? "");
  if (!conversationId) return fail("reply_buyer", "Диалог не указан");
  return okResult("reply_buyer", "Откройте чат с покупателем", {
    openUrl: conversationPath(conversationId),
  });
}

async function handleWithdrawFunds(
  sellerProfileId: string,
  payload: MobileSellerActionPayload,
): Promise<MobileSellerActionResult> {
  if (!isSellerPayoutEnabled()) {
    return fail("withdraw_funds", "Вывод средств недоступен");
  }

  const amount = Number(payload.amount);
  const methods = await listSellerPaymentMethods(sellerProfileId);
  const method = methods.find((m) => m.verified) ?? methods[0];
  if (!method) {
    return fail("withdraw_funds", "Добавьте способ выплаты в кабинете");
  }

  const balance = await prisma.sellerBalance.findUnique({ where: { sellerId: sellerProfileId } });
  const available = balance ? Number(balance.availableAmount) : 0;
  const reserved = balance ? Number(balance.reservedForPayoutAmount) : 0;
  const withdrawable = Math.max(0, available - reserved);
  const payoutAmount = Number.isFinite(amount) && amount > 0 ? amount : withdrawable;

  const validationError = validatePayoutAmount({ amount: payoutAmount, availableAmount: withdrawable });
  if (validationError) return fail("withdraw_funds", validationError);

  try {
    await createPayoutRequest({
      sellerId: sellerProfileId,
      amount: payoutAmount,
      paymentMethodId: method.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось создать заявку на вывод";
    return fail("withdraw_funds", message);
  }

  return okResult("withdraw_funds", "Заявка на вывод создана");
}

async function handleCompleteProfile(
  sellerProfileId: string,
  payload: MobileSellerActionPayload,
): Promise<MobileSellerActionResult> {
  const settings = await updateSellerSettings(sellerProfileId, {
    storeName: payload.storeName !== undefined ? String(payload.storeName) : undefined,
    phone: payload.phone !== undefined ? String(payload.phone) : undefined,
    description: payload.description !== undefined ? String(payload.description) : undefined,
  });

  return okResult("complete_profile", "Профиль обновлён", {
    undo: {
      action: "complete_profile",
      payload: {
        storeName: settings.storeName,
        phone: settings.phone,
        description: settings.description,
      },
    },
  });
}

async function handleUndoPublish(
  sellerProfileId: string,
  payload: MobileSellerActionPayload,
): Promise<MobileSellerActionResult> {
  const productId = String(payload.productId ?? "");
  if (!productId) return fail("publish_product", "Товар не указан");
  try {
    await updateProduct(productId, sellerProfileId, { status: ProductStatus.DRAFT });
  } catch (err) {
    const message = err instanceof ProductServiceError ? err.message : "Не удалось отменить публикацию";
    return fail("publish_product", message);
  }
  return okResult("publish_product", "Публикация отменена");
}

async function handleUndoOrderStatus(
  sellerProfileId: string,
  userId: string,
  role: import("@prisma/client").UserRole,
  action: "ship_order" | "confirm_order",
  payload: MobileSellerActionPayload,
): Promise<MobileSellerActionResult> {
  const orderId = String(payload.orderId ?? "");
  const revertStatus = String(payload.revertStatus ?? "") as OrderStatus;
  if (!orderId || !revertStatus) return fail(action, "Отмена недоступна");
  try {
    await updateSellerOrderStatus({
      orderId,
      toStatus: revertStatus,
      actorUserId: userId,
      actorRole: role,
      sellerProfileId,
    });
  } catch (err) {
    const message = err instanceof SellerServiceError ? err.message : "Не удалось отменить действие";
    return fail(action, message);
  }
  return okResult(action, "Действие отменено");
}

export async function executeMobileSellerAction(
  request: Request,
  input: MobileSellerActionRequest,
): Promise<MobileSellerActionResult> {
  const ctx = await requireSeller(request);
  if (!ctx) {
    return fail(input.action, "Требуется аккаунт продавца", "AUTHENTICATION");
  }

  const { user, sellerProfileId } = ctx;
  const payload = input.payload ?? {};

  if (payload.revertStatus && input.action === "ship_order") {
    return handleUndoOrderStatus(sellerProfileId, user.id, user.role, "ship_order", payload);
  }
  if (payload.revertStatus && input.action === "confirm_order") {
    return handleUndoOrderStatus(sellerProfileId, user.id, user.role, "confirm_order", payload);
  }
  if (payload.revertStatus === "DRAFT" && input.action === "publish_product") {
    return handleUndoPublish(sellerProfileId, payload);
  }

  switch (input.action) {
    case "update_stock":
      return handleUpdateStock(sellerProfileId, user.id, payload);
    case "publish_product":
      return handlePublishProduct(sellerProfileId, payload);
    case "resume_draft":
      return handleResumeDraft(sellerProfileId, payload);
    case "fix_moderation":
      return handleFixModeration(sellerProfileId, payload);
    case "ship_order":
      return handleShipOrder(sellerProfileId, user.id, user.role, payload);
    case "confirm_order":
      return handleConfirmOrder(sellerProfileId, user.id, user.role, payload);
    case "reply_buyer":
      return handleReplyBuyer(payload);
    case "withdraw_funds":
      return handleWithdrawFunds(sellerProfileId, payload);
    case "complete_profile":
      return handleCompleteProfile(sellerProfileId, payload);
    default:
      return fail(input.action, "Действие не поддерживается", "NOT_SUPPORTED");
  }
}
