"use server";

import { UserRole } from "@prisma/client";
import { AuthError } from "next-auth";

import { signIn, signOut, unstable_update } from "@/auth";
import { getSessionUser, loadUserAuthFromDb } from "@/features/auth/session";
import { hashPassword } from "@/features/auth/lib/password";
import { findUserByEmail } from "@/features/auth/lib/find-user-by-email";
import { signInSchema, signUpSchema } from "@/features/auth/schemas";
import { slugify } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export type AuthActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

async function uniqueStoreSlug(base: string): Promise<string> {
  let slug = slugify(base) || "store";
  let n = 0;
  while (
    await prisma.sellerProfile.findUnique({
      where: { slug },
      select: { id: true },
    })
  ) {
    n += 1;
    slug = `${slugify(base) || "store"}-${n}`;
  }
  return slug;
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    callbackUrl: formData.get("callbackUrl") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверьте поля формы",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const callbackUrl =
    parsed.data.callbackUrl && parsed.data.callbackUrl.startsWith("/")
      ? parsed.data.callbackUrl
      : ROUTES.HOME;

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "Неверный email или пароль" };
    }
    throw err;
  }

  return { ok: true };
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || "",
    role: formData.get("role") || UserRole.BUYER,
    storeName: formData.get("storeName") || "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверьте поля формы",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    return {
      ok: false,
      error: "Пользователь с таким email уже зарегистрирован",
      fieldErrors: { email: ["Email уже занят"] },
    };
  }

  const name =
    parsed.data.name && parsed.data.name.length > 0
      ? parsed.data.name
      : parsed.data.email.split("@")[0] ?? "Пользователь";

  const role = parsed.data.role ?? UserRole.BUYER;
  const passwordHash = await hashPassword(parsed.data.password);

  if (role === UserRole.SELLER) {
    const storeName =
      parsed.data.storeName && parsed.data.storeName.length > 0
        ? parsed.data.storeName
        : `Магазин ${name}`;
    const slug = await uniqueStoreSlug(storeName);

    await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        name,
        role: UserRole.SELLER,
        sellerProfile: {
          create: {
            storeName,
            slug,
            description: null,
          },
        },
      },
    });
  } else {
    // BUYER (default): no SellerProfile.
    await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        name,
        role: UserRole.BUYER,
      },
    });
  }

  const redirectTo = role === UserRole.SELLER ? ROUTES.SELLER : ROUTES.HOME;

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        ok: false,
        error: "Аккаунт создан, но не удалось войти. Попробуйте войти вручную.",
      };
    }
    throw err;
  }

  return { ok: true };
}

/**
 * Promote the current BUYER to SELLER and create a SellerProfile.
 * Idempotent if already a seller with a profile.
 */
export async function becomeSellerAction(
  storeNameInput?: string,
): Promise<AuthActionState> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Требуется вход" };
  }

  const dbUser = await loadUserAuthFromDb(user.id);
  if (!dbUser) {
    return { ok: false, error: "Пользователь не найден" };
  }

  if (dbUser.role === UserRole.ADMIN) {
    await unstable_update({});
    return { ok: true };
  }

  if (dbUser.role === UserRole.SELLER && dbUser.sellerProfileId) {
    await unstable_update({});
    return { ok: true };
  }

  const displayName = user.name ?? user.email.split("@")[0] ?? "Продавец";
  const storeName =
    storeNameInput && storeNameInput.trim().length >= 2
      ? storeNameInput.trim()
      : `Магазин ${displayName}`;
  const slug = await uniqueStoreSlug(storeName);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { role: UserRole.SELLER },
    });
    if (!dbUser.sellerProfileId) {
      await tx.sellerProfile.create({
        data: {
          userId: user.id,
          storeName,
          slug,
          description: null,
        },
      });
    }
  });

  // Refresh JWT claims so AuthNav / middleware see SELLER immediately.
  await unstable_update({});

  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: ROUTES.HOME });
}
