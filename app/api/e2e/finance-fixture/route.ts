/**
 * Deterministic finance E2E fixtures (staging/local only).
 * Gated by E2E_FIXTURE_SECRET.
 *
 * POST   — create paid order + HELD finance transaction for demo seller
 * DELETE — cleanup by marker
 */

import { NextResponse } from "next/server";
import {
  OrderFulfillmentType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  ProductStatus,
} from "@prisma/client";

import { recordOrderCreated } from "@/features/order-lifecycle/lib/transition";
import { syncFinanceOnPaymentInTx } from "@/lib/finance";
import { prisma } from "@/lib/prisma";

const SELLER_EMAIL = "seller@demo.lot";
const BUYER_EMAIL = "buyer@demo.lot";
const MARKER_PREFIX = "E2E-FINANCE-";

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
  if (!/^E2E-FINANCE-[A-Za-z0-9_-]+$/.test(m)) return null;
  return m;
}

function generateOrderNumber() {
  return `E2E${Date.now().toString(36).toUpperCase()}`;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { marker?: string; total?: number };
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

  const total = Math.max(100, Number(body.total ?? 5000));

  const [sellerUser, buyerUser] = await Promise.all([
    prisma.user.findUnique({
      where: { email: SELLER_EMAIL },
      include: { sellerProfile: true },
    }),
    prisma.user.findUnique({ where: { email: BUYER_EMAIL } }),
  ]);

  if (!sellerUser?.sellerProfile || !buyerUser) {
    return NextResponse.json({ error: "Demo users missing" }, { status: 500 });
  }

  const product = await prisma.product.findFirst({
    where: {
      sellerId: sellerUser.sellerProfile.id,
      status: ProductStatus.ACTIVE,
      stock: { gt: 0 },
      categoryId: { not: null },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!product?.categoryId) {
    return NextResponse.json(
      { error: "No eligible demo seller product" },
      { status: 500 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: buyerUser.id,
        orderNumber: generateOrderNumber(),
        status: OrderStatus.AWAITING_SELLER_CONFIRMATION,
        subtotal: new Prisma.Decimal(total.toFixed(2)),
        shippingCost: new Prisma.Decimal("0"),
        total: new Prisma.Decimal(total.toFixed(2)),
        currency: "RUB",
        fulfillmentType: OrderFulfillmentType.DELIVERY,
        items: {
          create: {
            productId: product.id,
            productName: `${marker} ${product.name}`,
            unitPrice: new Prisma.Decimal(total.toFixed(2)),
            quantity: 1,
            totalPrice: new Prisma.Decimal(total.toFixed(2)),
          },
        },
      },
    });

    await recordOrderCreated({ orderId: order.id, actorUserId: buyerUser.id, tx });

    await tx.payment.create({
      data: {
        orderId: order.id,
        userId: buyerUser.id,
        amount: new Prisma.Decimal(total.toFixed(2)),
        currency: "RUB",
        status: PaymentStatus.SUCCEEDED,
        paidAt: new Date(),
      },
    });

    await syncFinanceOnPaymentInTx(tx, order.id);

    return order;
  });

  return NextResponse.json({
    marker,
    orderId: result.id,
    orderNumber: result.orderNumber,
    orderPath: `/account/orders/${result.id}`,
    total,
    sellerEmail: SELLER_EMAIL,
    buyerEmail: BUYER_EMAIL,
    sellerProfileId: sellerUser.sellerProfile.id,
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

  const orders = await prisma.order.findMany({
    where: {
      items: { some: { productName: { contains: marker } } },
    },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);

  if (orderIds.length) {
    await prisma.financeTransaction.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.dispute.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.orderEvent.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  return NextResponse.json({ marker, deletedOrders: orderIds.length });
}
