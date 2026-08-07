import Link from "next/link";
import { redirect } from "next/navigation";

import { ComingSoonButton } from "@/components/layout/coming-soon-button";
import { Button } from "@/components/ui/button";
import {
  AccountShell,
  getUserProfile,
} from "@/features/account";
import { getSessionUser } from "@/features/auth";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Настройки",
};

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.SETTINGS)}`,
    );
  }

  const profile = await getUserProfile(user.id);
  if (!profile) {
    redirect(ROUTES.AUTH_SIGN_IN);
  }

  return (
    <AccountShell
      title="Настройки"
      description="Управление данными аккаунта."
    >
      <div className="animate-fade-up space-y-4 rounded-2xl border border-border bg-card/60 p-5 shadow-card sm:p-6">
        <p className="text-sm text-muted-foreground">
          Основные настройки профиля — имя, телефон, город и аватар — находятся
          на странице профиля.
        </p>
        <div className="rounded-xl border border-border/80 bg-surface/40 px-4 py-3 text-sm">
          <p>
            <span className="text-muted-foreground">Email: </span>
            <span className="font-medium">{profile.email}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            render={<Link href={`${ROUTES.PROFILE}?edit=1`} />}
          >
            Редактировать профиль
          </Button>
          <ComingSoonButton label="Сменить email" variant="outline" />
          <ComingSoonButton label="Сменить пароль" variant="outline" />
        </div>
      </div>
    </AccountShell>
  );
}
