import {
  PickupReservationStatus,
  Prisma,
} from "@prisma/client";

import { pickupPointSchema, type PickupPointInput } from "@/features/pickup/schemas";
import { prisma } from "@/lib/prisma";
import { toPriceNumber } from "@/features/products/mappers";

export type PickupPointDto = {
  id: string;
  sellerId: string;
  name: string;
  city: string;
  address: string;
  description: string | null;
  phone: string | null;
  workingHours: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PickupReservationListItem = {
  id: string;
  status: PickupReservationStatus;
  quantity: number;
  prepaymentPercent: number;
  prepaymentAmount: number;
  remainingAmount: number;
  createdAt: string;
  product: { id: string; title: string };
  pickupPoint: {
    id: string;
    name: string;
    city: string;
    address: string;
    workingHours: string | null;
  };
  buyer: { id: string; name: string | null; email: string };
  seller: { id: string; storeName: string; slug: string };
  orderId: string;
  orderNumber: string;
};

function mapPoint(row: {
  id: string;
  sellerId: string;
  name: string;
  city: string;
  address: string;
  description: string | null;
  phone: string | null;
  workingHours: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PickupPointDto {
  return {
    id: row.id,
    sellerId: row.sellerId,
    name: row.name,
    city: row.city,
    address: row.address,
    description: row.description,
    phone: row.phone,
    workingHours: row.workingHours,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function emptyToNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export async function listSellerPickupPoints(
  sellerId: string,
  opts?: { activeOnly?: boolean },
): Promise<PickupPointDto[]> {
  const rows = await prisma.pickupPoint.findMany({
    where: {
      sellerId,
      ...(opts?.activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return rows.map(mapPoint);
}

export async function getPickupPointForSeller(
  id: string,
  sellerId: string,
): Promise<PickupPointDto | null> {
  const row = await prisma.pickupPoint.findFirst({
    where: { id, sellerId },
  });
  return row ? mapPoint(row) : null;
}

export async function createPickupPoint(
  sellerId: string,
  input: PickupPointInput,
): Promise<PickupPointDto> {
  const parsed = pickupPointSchema.parse(input);
  const row = await prisma.pickupPoint.create({
    data: {
      sellerId,
      name: parsed.name,
      city: parsed.city,
      address: parsed.address,
      description: emptyToNull(parsed.description),
      phone: emptyToNull(parsed.phone),
      workingHours: emptyToNull(parsed.workingHours),
      isActive: parsed.isActive ?? true,
    },
  });
  return mapPoint(row);
}

export async function updatePickupPoint(
  id: string,
  sellerId: string,
  input: Partial<PickupPointInput>,
): Promise<PickupPointDto> {
  const existing = await prisma.pickupPoint.findFirst({
    where: { id, sellerId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Точка не найдена");
  }
  const parsed = pickupPointSchema.partial().parse(input);
  const row = await prisma.pickupPoint.update({
    where: { id },
    data: {
      ...(parsed.name != null ? { name: parsed.name } : {}),
      ...(parsed.city != null ? { city: parsed.city } : {}),
      ...(parsed.address != null ? { address: parsed.address } : {}),
      ...(parsed.description !== undefined
        ? { description: emptyToNull(parsed.description) }
        : {}),
      ...(parsed.phone !== undefined
        ? { phone: emptyToNull(parsed.phone) }
        : {}),
      ...(parsed.workingHours !== undefined
        ? { workingHours: emptyToNull(parsed.workingHours) }
        : {}),
      ...(parsed.isActive != null ? { isActive: parsed.isActive } : {}),
    },
  });
  return mapPoint(row);
}

export async function deletePickupPoint(
  id: string,
  sellerId: string,
): Promise<void> {
  const existing = await prisma.pickupPoint.findFirst({
    where: { id, sellerId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Точка не найдена");
  }
  await prisma.pickupPoint.delete({ where: { id } });
}

export async function setPickupPointActive(
  id: string,
  sellerId: string,
  isActive: boolean,
): Promise<PickupPointDto> {
  return updatePickupPoint(id, sellerId, { isActive });
}

/** Active pickup points linked to a product (public PDP / checkout). */
export async function listProductPickupPoints(
  productId: string,
): Promise<PickupPointDto[]> {
  const rows = await prisma.productPickupPoint.findMany({
    where: {
      productId,
      pickupPoint: { isActive: true },
    },
    include: { pickupPoint: true },
  });
  return rows.map((r) => mapPoint(r.pickupPoint));
}

const reservationInclude = {
  product: { select: { id: true, name: true } },
  pickupPoint: {
    select: {
      id: true,
      name: true,
      city: true,
      address: true,
      workingHours: true,
    },
  },
  buyer: { select: { id: true, name: true, email: true } },
  seller: { select: { id: true, storeName: true, slug: true } },
  order: { select: { id: true, orderNumber: true } },
} as const;

function mapReservation(
  row: Prisma.PickupReservationGetPayload<{ include: typeof reservationInclude }>,
): PickupReservationListItem {
  return {
    id: row.id,
    status: row.status,
    quantity: row.quantity,
    prepaymentPercent: row.prepaymentPercent,
    prepaymentAmount: toPriceNumber(row.prepaymentAmount),
    remainingAmount: toPriceNumber(row.remainingAmount),
    createdAt: row.createdAt.toISOString(),
    product: { id: row.product.id, title: row.product.name },
    pickupPoint: row.pickupPoint,
    buyer: row.buyer,
    seller: row.seller,
    orderId: row.order.id,
    orderNumber: row.order.orderNumber,
  };
}

export async function listBuyerReservations(
  buyerId: string,
): Promise<PickupReservationListItem[]> {
  const rows = await prisma.pickupReservation.findMany({
    where: { buyerId },
    include: reservationInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapReservation);
}

export async function listSellerReservations(
  sellerId: string,
): Promise<PickupReservationListItem[]> {
  const rows = await prisma.pickupReservation.findMany({
    where: { sellerId },
    include: reservationInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapReservation);
}

export async function updateReservationStatus(opts: {
  reservationId: string;
  sellerId: string;
  status: PickupReservationStatus;
  actorUserId?: string | null;
}): Promise<PickupReservationListItem> {
  const { transitionPickupReservationWithOrder, PickupCoordinatorError } =
    await import("@/features/order-lifecycle/lib/pickup-coordinator");

  try {
    await transitionPickupReservationWithOrder({
      reservationId: opts.reservationId,
      sellerId: opts.sellerId,
      toReservationStatus: opts.status,
      actorUserId: opts.actorUserId,
      reject: opts.status === "CANCELLED",
    });
  } catch (err) {
    if (err instanceof PickupCoordinatorError) {
      throw new Error(err.message);
    }
    throw err;
  }

  const updated = await prisma.pickupReservation.findFirst({
    where: { id: opts.reservationId, sellerId: opts.sellerId },
    include: reservationInclude,
  });
  if (!updated) throw new Error("Бронь не найдена");
  return mapReservation(updated);
}

/** Buyer may cancel only while PENDING. */
export async function cancelReservationByBuyer(opts: {
  reservationId: string;
  buyerId: string;
}): Promise<PickupReservationListItem> {
  const { cancelPickupReservationByBuyer, PickupCoordinatorError } =
    await import("@/features/order-lifecycle/lib/pickup-coordinator");

  try {
    await cancelPickupReservationByBuyer(opts);
  } catch (err) {
    if (err instanceof PickupCoordinatorError) {
      throw new Error(err.message);
    }
    throw err;
  }

  const updated = await prisma.pickupReservation.findFirst({
    where: { id: opts.reservationId, buyerId: opts.buyerId },
    include: reservationInclude,
  });
  if (!updated) throw new Error("Бронь не найдена");
  return mapReservation(updated);
}

export async function listAllReservationsForAdmin(limit = 50): Promise<
  PickupReservationListItem[]
> {
  const rows = await prisma.pickupReservation.findMany({
    take: Math.min(100, Math.max(1, limit)),
    orderBy: { createdAt: "desc" },
    include: reservationInclude,
  });
  return rows.map(mapReservation);
}

/** Sync product↔pickup-point links; verifies points belong to seller. */
export async function syncProductPickupPoints(
  tx: Prisma.TransactionClient,
  productId: string,
  sellerId: string,
  pickupPointIds: string[],
): Promise<void> {
  const unique = [...new Set(pickupPointIds.filter(Boolean))];
  if (unique.length > 0) {
    const owned = await tx.pickupPoint.count({
      where: { sellerId, id: { in: unique } },
    });
    if (owned !== unique.length) {
      throw new Error("Выбрана чужая или несуществующая точка самовывоза");
    }
  }
  await tx.productPickupPoint.deleteMany({ where: { productId } });
  if (unique.length > 0) {
    await tx.productPickupPoint.createMany({
      data: unique.map((pickupPointId) => ({ productId, pickupPointId })),
    });
  }
}
