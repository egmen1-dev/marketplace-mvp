import {
  AddressType,
  DeliveryMethod,
  DeliveryProvider,
  DeliveryStatus,
  Prisma,
  ProductStatus,
  OrderStatus,
} from "@prisma/client";

import { generateOrderNumber } from "@/features/orders/lib/order-number";
import type { CheckoutFormInput } from "@/features/orders/schemas";
import type {
  CreateOrderResult,
  OrderDetail,
  OrderDeliveryView,
  OrderItemView,
  OrderListItem,
  OrderShippingView,
} from "@/features/orders/types";
import { toPriceNumber } from "@/features/products/mappers";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { DeliveryError, getDeliveryProvider } from "@/lib/delivery";
import { prisma } from "@/lib/prisma";

const orderItemImageSelect = {
  id: true,
  url: true,
  alt: true,
  sortOrder: true,
  isPrimary: true,
} satisfies Prisma.ProductImageSelect;

function mapShipping(
  address: {
    fullName: string;
    phone: string | null;
    city: string;
    street: string;
  } | null,
): OrderShippingView {
  if (!address) return null;
  return {
    fullName: address.fullName,
    phone: address.phone,
    city: address.city,
    street: address.street,
  };
}

function mapDelivery(
  delivery: {
    method: DeliveryMethod;
    status: DeliveryStatus;
    provider: DeliveryProvider;
    cost: Prisma.Decimal;
    currency: string;
    trackingNumber: string | null;
    pickupPointId: string | null;
    pickupAddress: string | null;
    estimatedMinDays: number | null;
    estimatedMaxDays: number | null;
  } | null,
): OrderDeliveryView {
  if (!delivery) return null;
  return {
    method: delivery.method,
    status: delivery.status,
    provider: delivery.provider,
    cost: toPriceNumber(delivery.cost),
    currency: delivery.currency,
    trackingNumber: delivery.trackingNumber,
    pickupPointId: delivery.pickupPointId,
    pickupAddress: delivery.pickupAddress,
    estimatedMinDays: delivery.estimatedMinDays,
    estimatedMaxDays: delivery.estimatedMaxDays,
  };
}

function mapOrderItem(row: {
  id: string;
  productId: string;
  productName: string;
  productSku: string | null;
  quantity: number;
  unitPrice: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
  product: {
    images: Array<{
      id: string;
      url: string;
      alt: string | null;
      sortOrder: number;
      isPrimary: boolean;
    }>;
  };
}): OrderItemView {
  const image = row.product.images[0] ?? null;
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    productSku: row.productSku,
    quantity: row.quantity,
    unitPrice: toPriceNumber(row.unitPrice),
    totalPrice: toPriceNumber(row.totalPrice),
    primaryImage: image
      ? {
          id: image.id,
          url: image.url,
          alt: image.alt,
          sortOrder: image.sortOrder,
          isPrimary: image.isPrimary,
        }
      : null,
  };
}

export class OrderServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "OrderServiceError";
  }
}

export async function listOrdersForUser(
  userId: string,
): Promise<OrderListItem[]> {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      currency: true,
      createdAt: true,
      items: { select: { quantity: true } },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    total: toPriceNumber(order.total),
    currency: order.currency || DEFAULT_CURRENCY,
    itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
    createdAt: order.createdAt.toISOString(),
  }));
}

export async function getOrderForUser(
  userId: string,
  orderId: string,
): Promise<OrderDetail | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      shippingAddress: {
        select: {
          fullName: true,
          phone: true,
          city: true,
          street: true,
        },
      },
      delivery: {
        select: {
          method: true,
          status: true,
          provider: true,
          cost: true,
          currency: true,
          trackingNumber: true,
          pickupPointId: true,
          pickupAddress: true,
          estimatedMinDays: true,
          estimatedMaxDays: true,
        },
      },
      items: {
        orderBy: { productName: "asc" },
        include: {
          product: {
            select: {
              images: {
                orderBy: [
                  { isPrimary: "desc" },
                  { sortOrder: "asc" },
                ],
                take: 1,
                select: orderItemImageSelect,
              },
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: toPriceNumber(order.subtotal),
    shippingCost: toPriceNumber(order.shippingCost),
    total: toPriceNumber(order.total),
    currency: order.currency || DEFAULT_CURRENCY,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map(mapOrderItem),
    shipping: mapShipping(order.shippingAddress),
    delivery: mapDelivery(order.delivery),
  };
}

/**
 * Create order from the user's DB cart in a single transaction:
 * validate stock availability → quote CDEK delivery → snapshot prices →
 * Delivery row → clear cart.
 *
 * Stock is **not** decremented here. `finalizePaidOrder` decrements stock
 * only after confirmed Stripe payment. Failed / abandoned / cancelled
 * payments leave stock unchanged.
 *
 * Delivery cost is re-quoted on the server (never trust the client).
 */
export async function createOrderFromCart(
  userId: string,
  shipping: CheckoutFormInput,
): Promise<CreateOrderResult> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              currency: true,
              stock: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return { ok: false, error: "Корзина пуста" };
  }

  for (const item of cart.items) {
    const { product } = item;
    if (product.status !== ProductStatus.ACTIVE) {
      return {
        ok: false,
        error: `«${product.name}» недоступен для покупки`,
      };
    }
    if (product.stock < item.quantity) {
      return {
        ok: false,
        error:
          product.stock <= 0
            ? `«${product.name}» нет в наличии`
            : `Недостаточно «${product.name}»: доступно ${product.stock} шт.`,
      };
    }
  }

  const currency = cart.items[0]?.product.currency || DEFAULT_CURRENCY;
  let subtotal = new Prisma.Decimal(0);
  const lineSnapshots = cart.items.map((item) => {
    const unitPrice = item.product.price;
    const totalPrice = unitPrice.mul(item.quantity);
    subtotal = subtotal.add(totalPrice);
    return {
      productId: item.productId,
      productName: item.product.name,
      productSku: item.product.sku,
      unitPrice,
      quantity: item.quantity,
      totalPrice,
    };
  });

  const phone =
    shipping.phone && shipping.phone.trim().length > 0
      ? shipping.phone.trim()
      : null;
  const notes =
    shipping.notes && shipping.notes.trim().length > 0
      ? shipping.notes.trim()
      : null;

  const deliveryMethod =
    shipping.deliveryMethod === "PICKUP"
      ? DeliveryMethod.PICKUP
      : DeliveryMethod.COURIER;
  const pickupPointId =
    shipping.pickupPointId && shipping.pickupPointId.trim().length > 0
      ? shipping.pickupPointId.trim()
      : null;
  const pickupAddress =
    shipping.pickupAddress && shipping.pickupAddress.trim().length > 0
      ? shipping.pickupAddress.trim()
      : null;

  let quote;
  try {
    quote = await getDeliveryProvider().getQuote({
      method: shipping.deliveryMethod,
      city: shipping.city.trim(),
      pickupPointCode: pickupPointId ?? undefined,
    });
  } catch (err) {
    if (err instanceof DeliveryError) {
      return { ok: false, error: err.message };
    }
    console.error("[createOrderFromCart] delivery quote", err);
    return { ok: false, error: "Не удалось рассчитать доставку" };
  }

  const shippingCost = new Prisma.Decimal(quote.cost);
  const total = subtotal.add(shippingCost);

  const streetForAddress =
    deliveryMethod === DeliveryMethod.PICKUP
      ? (pickupAddress ?? shipping.street?.trim() ?? "Пункт выдачи СДЭК")
      : (shipping.street?.trim() ?? "");

  try {
    const order = await prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, stock: true, status: true },
        });
        if (!product || product.status !== ProductStatus.ACTIVE) {
          throw new OrderServiceError(
            "UNAVAILABLE",
            `«${item.product.name}» недоступен для покупки`,
          );
        }
        if (product.stock < item.quantity) {
          throw new OrderServiceError(
            "OUT_OF_STOCK",
            product.stock <= 0
              ? `«${product.name}» нет в наличии`
              : `Недостаточно «${product.name}»: доступно ${product.stock} шт.`,
          );
        }
      }

      const address = await tx.address.create({
        data: {
          userId,
          type: AddressType.SHIPPING,
          fullName: shipping.fullName.trim(),
          phone,
          city: shipping.city.trim(),
          street: streetForAddress,
        },
      });

      let created = null as Awaited<ReturnType<typeof tx.order.create>> | null;
      let attempts = 0;
      while (!created && attempts < 5) {
        attempts += 1;
        const orderNumber = generateOrderNumber();
        try {
          created = await tx.order.create({
            data: {
              userId,
              orderNumber,
              status: OrderStatus.NEW,
              subtotal,
              shippingCost,
              total,
              currency,
              shippingAddressId: address.id,
              notes,
              items: {
                create: lineSnapshots.map((line) => ({
                  productId: line.productId,
                  productName: line.productName,
                  productSku: line.productSku,
                  unitPrice: line.unitPrice,
                  quantity: line.quantity,
                  totalPrice: line.totalPrice,
                })),
              },
            },
          });
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
          ) {
            continue;
          }
          throw err;
        }
      }

      if (!created) {
        throw new OrderServiceError(
          "ORDER_NUMBER",
          "Не удалось создать номер заказа",
          500,
        );
      }

      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(
        estimatedDelivery.getDate() + quote.estimatedMaxDays,
      );

      await tx.delivery.create({
        data: {
          orderId: created.id,
          provider: DeliveryProvider.CDEK,
          method: deliveryMethod,
          status: DeliveryStatus.PENDING,
          cost: shippingCost,
          currency,
          trackingNumber: null,
          pickupPointId:
            deliveryMethod === DeliveryMethod.PICKUP ? pickupPointId : null,
          pickupAddress:
            deliveryMethod === DeliveryMethod.PICKUP ? pickupAddress : null,
          estimatedMinDays: quote.estimatedMinDays,
          estimatedMaxDays: quote.estimatedMaxDays,
          estimatedDelivery,
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  } catch (err) {
    if (err instanceof OrderServiceError) {
      return { ok: false, error: err.message };
    }
    console.error("[createOrderFromCart]", err);
    return { ok: false, error: "Не удалось оформить заказ" };
  }
}
