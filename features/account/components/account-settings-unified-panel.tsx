"use client";

import { useEffect, useState, useTransition } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePasswordAction,
  updateNotificationPrefsAction,
} from "@/features/account/actions/settings-actions";
import type { UserProfile } from "@/features/account/types";
import { ProfileEditForm } from "@/features/account/components/profile-edit-form";
import { trackAccountSettingsView } from "@/lib/lot-wallet/analytics";
import { ROUTES } from "@/lib/constants";
import { TOAST, toastError } from "@/lib/toasts";

type NotificationPrefs = {
  ordersEnabled: boolean;
  messagesEnabled: boolean;
  deliveryEnabled: boolean;
  priceDropEnabled: boolean;
  sellerPromoEnabled: boolean;
  growthTipsEnabled: boolean;
  lotNewsEnabled: boolean;
};

type AccountSettingsUnifiedPanelProps = {
  profile: UserProfile;
  notificationPrefs: NotificationPrefs;
  isSeller: boolean;
};

export function AccountSettingsUnifiedPanel({
  profile,
  notificationPrefs: initialPrefs,
  isSeller,
}: AccountSettingsUnifiedPanelProps) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    trackAccountSettingsView();
  }, []);

  function saveNotifications() {
    startTransition(() => {
      void (async () => {
        const result = await updateNotificationPrefsAction(prefs);
        if (!result.ok) {
          toastError(result.error ?? "Не удалось сохранить");
          return;
        }
        toast.success(TOAST.SETTINGS_SAVED);
      })();
    });
  }

  function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    startTransition(() => {
      void (async () => {
        const result = await changePasswordAction({
          password,
          passwordConfirm,
        });
        if (!result.ok) {
          setPasswordError(result.error ?? "Ошибка");
          toastError(result.error ?? "Ошибка");
          return;
        }
        setPassword("");
        setPasswordConfirm("");
        toast.success("Пароль обновлён");
      })();
    });
  }

  return (
    <div className="flex flex-col gap-8" data-testid="account-settings-unified">
      <section id="profile" className="scroll-mt-24">
        <h2 className="font-heading text-lg font-semibold">Профиль</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Имя, телефон, город и аватар — редактируются здесь, без отдельного экрана.
        </p>
        <div className="mt-4">
          <ProfileEditForm
            profile={profile}
            onCancelHref={ROUTES.SETTINGS}
            onSavedHref={ROUTES.SETTINGS}
          />
        </div>
      </section>

      <section id="security" className="scroll-mt-24 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">Безопасность</h2>
        <form onSubmit={savePassword} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Новый пароль</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Подтвердите пароль</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {passwordError ? (
            <p className="text-sm text-destructive">{passwordError}</p>
          ) : null}
          <Button type="submit" disabled={isPending || !password}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : "Сохранить пароль"}
          </Button>
        </form>

        <div className="mt-6 rounded-xl border border-border/80 bg-surface/40 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Активные сеансы</p>
          <p className="mt-1">
            Управление отдельными сеансами пока недоступно — используется вход по паролю с
            JWT-сессией на 14 дней. GAP: backend session registry.
          </p>
        </div>
      </section>

      <section id="notifications" className="scroll-mt-24 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">Уведомления</h2>
        <ul className="mt-4 space-y-4">
          {(
            [
              ["ordersEnabled", "Заказы"],
              ["messagesEnabled", "Сообщения"],
              ["deliveryEnabled", "Изменение доставки"],
              ["priceDropEnabled", "Снижение цены"],
              ...(isSeller
                ? ([
                    ["sellerPromoEnabled", "Продвижение продавца"],
                    ["growthTipsEnabled", "Советы для роста"],
                  ] as const)
                : []),
              ["lotNewsEnabled", "Новости ЛОТ"],
            ] as const
          ).map(([key, label]) => (
            <li key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm">{label}</span>
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, [key]: e.target.checked }))
                }
                className="size-4 accent-primary"
              />
            </li>
          ))}
        </ul>
        <Button className="mt-4" onClick={saveNotifications} disabled={isPending}>
          Сохранить
        </Button>
      </section>
    </div>
  );
}
