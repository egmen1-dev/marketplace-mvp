"use server";

import { PickupReservationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  AuthRequiredError,
  getSessionUser,
  requireSellerSession,
  SellerRequiredError,
} from "@/features/auth";
import { pickupPointSchema } from "@/features/pickup/schemas";
import {
  createPickupPoint,
  deletePickupPoint,
  setPickupPointActive,
  updatePickupPoint,
  updateReservationStatus,
  cancelReservationByBuyer,
} from "@/features/pickup/queries";
import { ROUTES } from "@/lib/constants";

export type PickupActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function authFail(err: unknown): PickupActionState | null {
  if (err instanceof AuthRequiredError) {
    return { ok: false, error: "Требуется вход" };
  }
  if (err instanceof SellerRequiredError) {
    return { ok: false, error: "Нужен профиль продавца" };
  }
  return null;
}

function formBool(v: FormDataEntryValue | null): boolean {
  return v === "on" || v === "true" || v === "1";
}

export async function createPickupPointAction(
  _prev: PickupActionState,
  formData: FormData,
): Promise<PickupActionState> {
  try {
    const seller = await requireSellerSession();
    const parsed = pickupPointSchema.safeParse({
      name: formData.get("name"),
      city: formData.get("city"),
      address: formData.get("address"),
      description: formData.get("description") || null,
      phone: formData.get("phone") || null,
      workingHours: formData.get("workingHours") || null,
      isActive: formData.has("isActive")
        ? formBool(formData.get("isActive"))
        : true,
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: "Проверьте поля",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }
    await createPickupPoint(seller.sellerProfileId, parsed.data);
  } catch (err) {
    const auth = authFail(err);
    if (auth) return auth;
    console.error("[createPickupPointAction]", err);
    return { ok: false, error: "Не удалось создать точку" };
  }

  revalidatePath(ROUTES.ACCOUNT_PICKUP_POINTS);
  redirect(ROUTES.ACCOUNT_PICKUP_POINTS);
}

export async function updatePickupPointAction(
  pointId: string,
  _prev: PickupActionState,
  formData: FormData,
): Promise<PickupActionState> {
  try {
    const seller = await requireSellerSession();
    const parsed = pickupPointSchema.safeParse({
      name: formData.get("name"),
      city: formData.get("city"),
      address: formData.get("address"),
      description: formData.get("description") || null,
      phone: formData.get("phone") || null,
      workingHours: formData.get("workingHours") || null,
      isActive: formBool(formData.get("isActive")),
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: "Проверьте поля",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }
    await updatePickupPoint(pointId, seller.sellerProfileId, parsed.data);
  } catch (err) {
    const auth = authFail(err);
    if (auth) return auth;
    console.error("[updatePickupPointAction]", err);
    return { ok: false, error: "Не удалось сохранить" };
  }

  revalidatePath(ROUTES.ACCOUNT_PICKUP_POINTS);
  redirect(ROUTES.ACCOUNT_PICKUP_POINTS);
}

export async function deletePickupPointAction(
  pointId: string,
): Promise<PickupActionState> {
  try {
    const seller = await requireSellerSession();
    await deletePickupPoint(pointId, seller.sellerProfileId);
    revalidatePath(ROUTES.ACCOUNT_PICKUP_POINTS);
    return { ok: true };
  } catch (err) {
    const auth = authFail(err);
    if (auth) return auth;
    console.error("[deletePickupPointAction]", err);
    return { ok: false, error: "Не удалось удалить" };
  }
}

export async function togglePickupPointAction(
  pointId: string,
  isActive: boolean,
): Promise<PickupActionState> {
  try {
    const seller = await requireSellerSession();
    await setPickupPointActive(pointId, seller.sellerProfileId, isActive);
    revalidatePath(ROUTES.ACCOUNT_PICKUP_POINTS);
    return { ok: true };
  } catch (err) {
    const auth = authFail(err);
    if (auth) return auth;
    return { ok: false, error: "Не удалось обновить статус" };
  }
}

export async function updateReservationStatusAction(
  reservationId: string,
  status: PickupReservationStatus,
): Promise<PickupActionState> {
  try {
    const seller = await requireSellerSession();
    await updateReservationStatus({
      reservationId,
      sellerId: seller.sellerProfileId,
      status,
      actorUserId: seller.userId,
    });
    revalidatePath(ROUTES.ACCOUNT_RESERVATIONS);
    return { ok: true };
  } catch (err) {
    const auth = authFail(err);
    if (auth) return auth;
    console.error("[updateReservationStatusAction]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Не удалось обновить статус",
    };
  }
}

export async function cancelReservationByBuyerAction(
  reservationId: string,
): Promise<PickupActionState> {
  try {
    const user = await requireBuyerSession();
    await cancelReservationByBuyer({
      reservationId,
      buyerId: user.id,
    });
    revalidatePath(ROUTES.ACCOUNT_RESERVATIONS);
    return { ok: true };
  } catch (err) {
    const auth = authFail(err);
    if (auth) return auth;
    console.error("[cancelReservationByBuyerAction]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Не удалось отменить бронь",
    };
  }
}

/** Buyer page gate helper — any logged-in user. */
export async function requireBuyerSession() {
  const user = await getSessionUser();
  if (!user) throw new AuthRequiredError();
  return user;
}
