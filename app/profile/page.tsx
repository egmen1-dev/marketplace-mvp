import { redirect } from "next/navigation";

import {
  AccountShell,
  getUserProfile,
  ProfileEditForm,
  ProfileView,
} from "@/features/account";
import { getSessionUser } from "@/features/auth";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Профиль",
};

type ProfilePageProps = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const { edit } = await searchParams;
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.PROFILE)}`,
    );
  }

  const profile = await getUserProfile(user.id);
  if (!profile) {
    redirect(ROUTES.AUTH_SIGN_IN);
  }

  const isEditing = edit === "1";

  return (
    <AccountShell
      title={isEditing ? "Редактирование профиля" : "Мой профиль"}
      description={
        isEditing
          ? "Обновите имя, контакты и аватар."
          : "Ваши данные на маркетплейсе."
      }
    >
      {isEditing ? (
        <ProfileEditForm profile={profile} />
      ) : (
        <ProfileView profile={profile} />
      )}
    </AccountShell>
  );
}
