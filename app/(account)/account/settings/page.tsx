import Link from "next/link";
import { redirect } from "next/navigation";

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
          Имя, телефон, город и аватар редактируются в профиле. Email используется
          для входа и уведомлений по заказам.
        </p>
        <div className="rounded-xl border border-border/80 bg-surface/40 px-4 py-3 text-sm">
          <p>
            <span className="text-muted-foreground">Email: </span>
            <span className="font-medium">{profile.email}</span>
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href={`${ROUTES.PROFILE}?edit=1`} />}
        >
          Редактировать профиль
        </Button>
      </div>
    </AccountShell>
  );
}
