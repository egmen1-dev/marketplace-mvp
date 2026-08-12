import { Prisma, ProductStatus } from "@prisma/client";

import {
  buildCartView,
  clampQuantity,
  lineTotal,
} from "@/features/cart/lib/totals";
import type {
  CartLineItem,
  CartProductSnapshot,
  CartView,
  GuestCartItem,
} from "@/features/cart/types";
import { toPriceNumber } from "@/features/products/mappers";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { resolvePublicImageUrl } from "@/lib/images";
import { prisma } from "@/lib/prisma";

const cartProductSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  currency: true,
  stock: true,
  status: true,
  weight: true,
  lengthCm: true,
  widthCm: true,
  heightCm: true,
  images: {
    orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
    take: 1,
    select: {
      id: true,
      url: true,
      alt: true,
      sortOrder: true,
      isPrimary: true,
    },
  },
} satisfies Prisma.ProductSelect;

type CartProductRow = Prisma.ProductGetPayload<{
  select: typeof cartProductSelect;
}>;

function mapCartProduct(row: CartProductRow): CartProductSnapshot {
  const image = row.images[0] ?? null;
  return {
    id: row.id,
    title: row.name,
    slug: row.slug,
    price: toPriceNumber(row.price),
    currency: row.currency || DEFAULT_CURRENCY,
    stock: row.stock,
    status: row.status,
    weight: row.weight != null ? toPriceNumber(row.weight) : null,
    lengthCm: row.lengthCm != null ? toPriceNumber(row.lengthCm) : null,
    widthCm: row.widthCm != null ? toPriceNumber(row.widthCm) : null,
    heightCm: row.heightCm != null ? toPriceNumber(row.heightCm) : null,
    primaryImage: image
      ? {
          id: image.id,
          url: resolvePublicImageUrl(image.url) ?? image.url,
          alt: image.alt,
          sortOrder: image.sortOrder,
          isPrimary: image.isPrimary,
        }
      : null,
  };
}

async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });
}

async function loadCartView(cartId: string): Promise<CartView> {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    orderBy: { createdAt: "asc" },
    include: {
      product: { select: cartProductSelect },
    },
  });

  const lines: CartLineItem[] = items.map((item) => {
    const product = mapCartProduct(item.product);
    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      product,
      lineTotal: lineTotal(product.price, item.quantity),
    };
  });

  return buildCartView(lines);
}

export async function getCartProductsByIds(
  ids: string[],
): Promise<CartProductSnapshot[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: { id: { in: unique } },
    select: cartProductSelect,
  });

  return rows.map(mapCartProduct);
}

export async function getCartForUser(userId: string): Promise<CartView> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!cart) {
    return buildCartView([]);
  }
  return loadCartView(cart.id);
}

async function assertPurchasableProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: cartProductSelect,
  });

  if (!product) {
    throw new CartServiceError("NOT_FOUND", "Товар не найден", 404);
  }
  if (product.status !== ProductStatus.ACTIVE) {
    throw new CartServiceError(
      "UNAVAILABLE",
      "Товар недоступен для покупки",
      400,
    );
  }
  if (product.stock <= 0) {
    throw new CartServiceError("OUT_OF_STOCK", "Товара нет в наличии", 400);
  }

  return mapCartProduct(product);
}

export async function addToCart(
  userId: string,
  productId: string,
  quantity = 1,
): Promise<CartView> {
  const product = await assertPurchasableProduct(productId);
  const qtyToAdd = Math.max(1, Math.floor(quantity));
  const cart = await getOrCreateCart(userId);

  const existing = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: { cartId: cart.id, productId },
    },
  });

  const nextQty = clampQuantity(
    (existing?.quantity ?? 0) + qtyToAdd,
    product.stock,
  );

  if (nextQty < 1) {
    throw new CartServiceError("OUT_OF_STOCK", "Товара нет в наличии", 400);
  }

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQty },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity: nextQty,
      },
    });
  }

  await prisma.cart.update({
    where: { id: cart.id },
    data: { updatedAt: new Date() },
  });

  return loadCartView(cart.id);
}

export async function updateCartItemQuantity(
  userId: string,
  productId: string,
  quantity: number,
): Promise<CartView> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!cart) {
    throw new CartServiceError("EMPTY", "Корзина пуста", 404);
  }

  const existing = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: { cartId: cart.id, productId },
    },
  });
  if (!existing) {
    throw new CartServiceError("ITEM_NOT_FOUND", "Товар не в корзине", 404);
  }

  const qty = Math.floor(quantity);
  if (qty < 1) {
    await prisma.cartItem.delete({ where: { id: existing.id } });
    await prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });
    return loadCartView(cart.id);
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true, status: true },
  });
  if (!product) {
    await prisma.cartItem.delete({ where: { id: existing.id } });
    throw new CartServiceError("NOT_FOUND", "Товар не найден", 404);
  }

  const nextQty = clampQuantity(qty, product.stock);
  if (nextQty < 1) {
    await prisma.cartItem.delete({ where: { id: existing.id } });
  } else {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQty },
    });
  }

  await prisma.cart.update({
    where: { id: cart.id },
    data: { updatedAt: new Date() },
  });

  return loadCartView(cart.id);
}

export async function removeFromCart(
  userId: string,
  productId: string,
): Promise<CartView> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!cart) {
    return buildCartView([]);
  }

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id, productId },
  });

  await prisma.cart.update({
    where: { id: cart.id },
    data: { updatedAt: new Date() },
  });

  return loadCartView(cart.id);
}

/**
 * Merge guest localStorage lines into the user's DB cart (quantities add up,
 * capped by stock). Safe to call multiple times; empty list is a no-op.
 */
export async function mergeGuestCartIntoUser(
  userId: string,
  guestItems: GuestCartItem[],
): Promise<CartView> {
  if (guestItems.length === 0) {
    return getCartForUser(userId);
  }

  const cart = await getOrCreateCart(userId);
  const productIds = [...new Set(guestItems.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      status: ProductStatus.ACTIVE,
    },
    select: { id: true, stock: true },
  });
  const stockById = new Map(products.map((p) => [p.id, p.stock]));

  for (const item of guestItems) {
    const stock = stockById.get(item.productId);
    if (stock == null || stock <= 0) continue;

    const existing = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: { cartId: cart.id, productId: item.productId },
      },
    });

    const nextQty = clampQuantity(
      (existing?.quantity ?? 0) + Math.max(1, Math.floor(item.quantity)),
      stock,
    );
    if (nextQty < 1) continue;

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: item.productId,
          quantity: nextQty,
        },
      });
    }
  }

  await prisma.cart.update({
    where: { id: cart.id },
    data: { updatedAt: new Date() },
  });

  return loadCartView(cart.id);
}

export class CartServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CartServiceError";
  }
}
