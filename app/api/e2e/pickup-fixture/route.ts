/**
 * Deterministic pickup E2E fixtures (staging/local only).
 * Gated by E2E_FIXTURE_SECRET — never open without the secret.
 *
 * POST  — create Seller A product + pickup point (marker-scoped)
 * DELETE — cleanup entities whose names contain the marker
 */

import { NextResponse } from "next/server";
import { Prisma, ProductStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { syncProductPickupPoints } from "@/features/pickup/queries";
import { setInventoryQuantity } from "@/features/orders/lib/inventory-sync";
import { slugify } from "@/features/products/mappers";

const SELLER_EMAIL = "seller@demo.lot";
const MARKER_PREFIX = "E2E-PICKUP-";

function authorize(request: Request): boolean {
  const expected = process.env.E2E_FIXTURE_SECRET?.trim();
  if (!expected) return false;
  const got = request.headers.get("x-e2e-secret")?.trim();
  return Boolean(got && got === expected);
}

function assertMarker(marker: string): string | null {
  const m = marker.trim();
  if (!m.startsWith(MARKER_PREFIX) || m.length < MARKER_PREFIX.length + 4) {
    return null;
  }
  if (!/^E2E-PICKUP-[A-Za-z0-9_-]+$/.test(m)) return null;
  return m;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    marker?: string;
    prepaymentPercent?: number;
    price?: number;
    stock?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const marker = assertMarker(body.marker ?? "");
  if (!marker) {
    return NextResponse.json(
      { error: `marker must match ${MARKER_PREFIX}<id>` },
      { status: 400 },
    );
  }

  const prepaymentPercent = [0, 10, 20, 30, 50, 100].includes(
    Number(body.prepaymentPercent),
  )
    ? Number(body.prepaymentPercent)
    : 20;
  const price = Number(body.price ?? 10_000);
  const stock = Math.max(1, Number(body.stock ?? 3));

  const sellerUser = await prisma.user.findUnique({
    where: { email: SELLER_EMAIL },
    include: { sellerProfile: true },
  });
  if (!sellerUser?.sellerProfile) {
    return NextResponse.json(
      { error: `Demo seller ${SELLER_EMAIL} missing` },
      { status: 500 },
    );
  }
  const sellerId = sellerUser.sellerProfile.id;

  const title = `${marker} Тепловая пушка`;
  const pointName = `${marker} Склад`;
  const baseSlug = slugify(title).slice(0, 60) || `e2e-pickup-${Date.now()}`;

  const result = await prisma.$transaction(async (tx) => {
    const point = await tx.pickupPoint.create({
      data: {
        sellerId,
        name: pointName,
        city: "Екатеринбург",
        address: "ул. Ленина 10",
        workingHours: "Пн-Пт 09:00-18:00",
        isActive: true,
      },
    });

    let slug = baseSlug;
    let n = 1;
    while (
      await tx.product.findUnique({
        where: { sellerId_slug: { sellerId, slug } },
        select: { id: true },
      })
    ) {
      n += 1;
      slug = `${baseSlug}-${n}`;
    }

    const product = await tx.product.create({
      data: {
        sellerId,
        name: title,
        slug,
        description: `Pickup fixture ${marker}`,
        price: new Prisma.Decimal(price.toFixed(2)),
        stock,
        city: "Екатеринбург",
        status: ProductStatus.ACTIVE,
        pickupEnabled: true,
        reservationEnabled: true,
        prepaymentPercent,
      },
    });

    await syncProductPickupPoints(tx, product.id, sellerId, [point.id]);
    await setInventoryQuantity(tx, {
      productId: product.id,
      quantity: stock,
      note: `E2E fixture ${marker}`,
    });

    return { product, point };
  });

  return NextResponse.json({
    marker,
    productId: result.product.id,
    productPath: `/product/${result.product.id}`,
    title: result.product.name,
    pickupPointId: result.point.id,
    pickupPointName: result.point.name,
    prepaymentPercent,
    price,
    stock,
    sellerUserId: sellerUser.id,
    sellerProfileId: sellerId,
    sellerEmail: SELLER_EMAIL,
    buyerEmail: "buyer@demo.lot",
  });
}

export async function DELETE(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const marker = assertMarker(url.searchParams.get("marker") ?? "");
  if (!marker) {
    return NextResponse.json(
      { error: `marker must match ${MARKER_PREFIX}<id>` },
      { status: 400 },
    );
  }

  const products = await prisma.product.findMany({
    where: { name: { contains: marker } },
    select: { id: true },
  });
  const productIds = products.map((p) => p.id);

  if (productIds.length) {
    const conversations = await prisma.conversation.findMany({
      where: { productId: { in: productIds } },
      select: { id: true },
    });
    const conversationIds = conversations.map((c) => c.id);
    if (conversationIds.length) {
      await prisma.message.deleteMany({
        where: { conversationId: { in: conversationIds } },
      });
      await prisma.conversation.deleteMany({
        where: { id: { in: conversationIds } },
      });
    }

    await prisma.pickupReservation.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.cartItem.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.favorite.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.productView.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.inventoryHistory.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.productInventory.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.productCharacteristicValue.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.productPickupPoint.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.productImage.deleteMany({
      where: { productId: { in: productIds } },
    });

    // Orders that only contain fixture lines: detach lines then delete empty orders.
    const orderItems = await prisma.orderItem.findMany({
      where: { productId: { in: productIds } },
      select: { id: true, orderId: true },
    });
    const orderIds = [...new Set(orderItems.map((i) => i.orderId))];
    if (orderItems.length) {
      await prisma.orderItem.deleteMany({
        where: { id: { in: orderItems.map((i) => i.id) } },
      });
    }
    for (const orderId of orderIds) {
      const remaining = await prisma.orderItem.count({ where: { orderId } });
      if (remaining === 0) {
        await prisma.orderStatusHistory.deleteMany({ where: { orderId } });
        await prisma.payment.deleteMany({ where: { orderId } });
        await prisma.delivery.deleteMany({ where: { orderId } });
        await prisma.order.delete({ where: { id: orderId } }).catch(() => undefined);
      }
    }

    await prisma.product.deleteMany({
      where: { id: { in: productIds } },
    });
  }

  const points = await prisma.pickupPoint.deleteMany({
    where: { name: { contains: marker } },
  });

  return NextResponse.json({
    marker,
    deletedProducts: productIds.length,
    deletedPickupPoints: points.count,
  });
}
