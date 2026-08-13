/**
 * Deterministic promotion E2E fixtures (staging/local only).
 * Gated by E2E_FIXTURE_SECRET — never open without the secret.
 *
 * POST   — create promotion-ready product for demo seller (marker-scoped)
 * DELETE — cleanup entities whose names contain the marker
 */

import { NextResponse } from "next/server";
import { Prisma, ProductStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { setInventoryQuantity } from "@/features/orders/lib/inventory-sync";
import { slugify } from "@/features/products/mappers";

const SELLER_EMAIL = "seller@demo.lot";
const MARKER_PREFIX = "E2E-PROMO-";
const FIXTURE_IMAGE =
  "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80";

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
  if (!/^E2E-PROMO-[A-Za-z0-9_-]+$/.test(m)) return null;
  return m;
}

async function resolvePromotionReadyType() {
  const types = await prisma.productType.findMany({
    where: { isActive: true },
    include: {
      category: { select: { id: true } },
      characteristics: { where: { required: true } },
    },
  });

  const sorted = types.sort(
    (a, b) => a.characteristics.length - b.characteristics.length,
  );
  const chosen = sorted[0];
  if (!chosen) return null;

  return {
    productTypeId: chosen.id,
    categoryId: chosen.category.id,
    requiredCharacteristics: chosen.characteristics,
  };
}

function characteristicValueData(
  def: { type: string },
): Pick<
  Prisma.ProductCharacteristicValueCreateWithoutProductInput,
  "valueText" | "valueNumber" | "valueBoolean" | "valueJson"
> {
  switch (def.type) {
    case "NUMBER":
      return { valueNumber: new Prisma.Decimal("5.5") };
    case "BOOLEAN":
      return { valueBoolean: true };
    case "SELECT":
    case "TEXT":
    default:
      return { valueText: "E2E fixture" };
  }
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { marker?: string; price?: number; stock?: number };
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

  const price = Number(body.price ?? 12_990);
  const stock = Math.max(1, Number(body.stock ?? 5));

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

  const typeInfo = await resolvePromotionReadyType();
  if (!typeInfo) {
    return NextResponse.json(
      { error: "No promotion-ready product type in taxonomy" },
      { status: 500 },
    );
  }

  const title = `${marker} Дрель PRO`;
  const baseSlug = slugify(title).slice(0, 60) || `e2e-promo-${Date.now()}`;

  const product = await prisma.$transaction(async (tx) => {
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

    const created = await tx.product.create({
      data: {
        sellerId,
        name: title,
        slug,
        description:
          "Профессиональная дрель для E2E promotion fixture. Полная карточка с фото, ценой и характеристиками.",
        price: new Prisma.Decimal(price.toFixed(2)),
        stock,
        city: "Екатеринбург",
        status: ProductStatus.ACTIVE,
        categoryId: typeInfo.categoryId,
        productTypeId: typeInfo.productTypeId,
        images: {
          create: [
            {
              url: FIXTURE_IMAGE,
              alt: title,
              sortOrder: 0,
              isPrimary: true,
            },
          ],
        },
        characteristicValues: {
          create: typeInfo.requiredCharacteristics.map((def) => ({
            definitionId: def.id,
            ...characteristicValueData(def),
          })),
        },
      },
    });

    await setInventoryQuantity(tx, {
      productId: created.id,
      quantity: stock,
      note: `E2E promotion fixture ${marker}`,
    });

    return created;
  });

  return NextResponse.json({
    marker,
    productId: product.id,
    productPath: `/product/${product.id}`,
    title: product.name,
    price,
    stock,
    sellerUserId: sellerUser.id,
    sellerProfileId: sellerId,
    sellerEmail: SELLER_EMAIL,
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
    await prisma.promotionCampaign.deleteMany({
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
    await prisma.productImage.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.product.deleteMany({
      where: { id: { in: productIds } },
    });
  }

  return NextResponse.json({
    marker,
    deletedProducts: productIds.length,
  });
}
