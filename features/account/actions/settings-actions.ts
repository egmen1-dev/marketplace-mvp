import { z } from "zod";

import { hashPassword, verifyPassword } from "@/features/auth/lib/password";
import { prisma } from "@/lib/prisma";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Введите текущий пароль"),
    password: z.string().min(8, "Минимум 8 символов"),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Пароли не совпадают",
    path: ["passwordConfirm"],
  });

export async function changePasswordAction(
  input: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Проверьте пароль" };
  }

  const { getSessionUser } = await import("@/features/auth");
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Требуется вход" };

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!row?.passwordHash) {
    return { ok: false, error: "Смена пароля недоступна для этого аккаунта" };
  }

  const currentValid = await verifyPassword(parsed.data.currentPassword, row.passwordHash);
  if (!currentValid) {
    return { ok: false, error: "Текущий пароль указан неверно" };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { ok: true };
}

const notificationPrefsSchema = z.object({
  ordersEnabled: z.boolean(),
  messagesEnabled: z.boolean(),
  deliveryEnabled: z.boolean(),
  priceDropEnabled: z.boolean(),
  sellerPromoEnabled: z.boolean(),
  growthTipsEnabled: z.boolean(),
  lotNewsEnabled: z.boolean(),
});

export async function updateNotificationPrefsAction(
  input: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = notificationPrefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Некорректные настройки" };

  const { getSessionUser } = await import("@/features/auth");
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Требуется вход" };

  await prisma.userNotificationPrefs.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });

  return { ok: true };
}

export async function getNotificationPrefsForUser(userId: string) {
  const row = await prisma.userNotificationPrefs.findUnique({ where: { userId } });
  return (
    row ?? {
      ordersEnabled: true,
      messagesEnabled: true,
      deliveryEnabled: true,
      priceDropEnabled: true,
      sellerPromoEnabled: true,
      growthTipsEnabled: true,
      lotNewsEnabled: false,
    }
  );
}
