import Link from "next/link";
import {
  Clock,
  Heart,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Package,
  Settings,
  Shield,
  Store,
  User,
} from "lucide-react";

import { headerActionClassName } from "@/components/layout/header-action";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/auth/actions";
import type { SessionUser } from "@/features/auth/session";
import { ROUTES } from "@/lib/constants";

type AuthNavProps = {
  user: SessionUser | null;
};

export function AuthNav({ user }: AuthNavProps) {
  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-header"
              className={headerActionClassName()}
              aria-label="Профиль"
              title="Профиль"
            />
          }
        >
          <User />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Профиль</DropdownMenuLabel>
            <DropdownMenuItem render={<Link href={ROUTES.AUTH_SIGN_IN} />}>
              Войти
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href={ROUTES.AUTH_SIGN_UP} />}>
              Регистрация
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const label = user.name || user.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-header"
            className={headerActionClassName()}
            aria-label="Профиль"
            title={label}
          />
        }
      >
        <User />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{label}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href={ROUTES.ACCOUNT} />}>
            <LayoutGrid className="size-4" />
            Кабинет
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link href={ROUTES.ACCOUNT_MESSAGES} />}
            data-testid="profile-menu-messages"
          >
            <MessageCircle className="size-4" />
            Сообщения
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={ROUTES.PROFILE} />}>
            <User className="size-4" />
            Профиль
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={ROUTES.FAVORITES} />}>
            <Heart className="size-4" />
            Избранное
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={ROUTES.HISTORY} />}>
            <Clock className="size-4" />
            История
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={ROUTES.ORDERS} />}>
            <Package className="size-4" />
            Покупки
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={ROUTES.SETTINGS} />}>
            <Settings className="size-4" />
            Настройки
          </DropdownMenuItem>
          {(user.role === "SELLER" || user.role === "ADMIN") &&
          user.sellerProfileId ? (
            <DropdownMenuItem render={<Link href={ROUTES.ACCOUNT_SALES} />}>
              <Store className="size-4" />
              Мои продажи
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              render={<Link href={`${ROUTES.ACCOUNT}?sell=1`} />}
            >
              <Store className="size-4" />
              Начать продавать
            </DropdownMenuItem>
          )}
          {user.role === "ADMIN" ? (
            <DropdownMenuItem render={<Link href={ROUTES.ADMIN} />}>
              <Shield className="size-4" />
              Админ-панель
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* Form action required so Next.js handles NEXT_REDIRECT from signOut */}
        <form action={signOutAction} className="w-full">
          <button
            type="submit"
            className="flex w-full cursor-default items-center gap-2 rounded-md px-1.5 py-1 text-sm text-destructive outline-none hover:bg-destructive/10"
          >
            <LogOut className="size-4" />
            Выйти
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
