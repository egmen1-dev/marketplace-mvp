import Link from "next/link";
import { Clock, Heart, LogOut, Package, Settings, Store, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
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
              size="icon-sm"
              className="text-muted-foreground"
              aria-label="Профиль"
              title="Профиль"
            />
          }
        >
          <User />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuLabel>Профиль</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href={ROUTES.AUTH_SIGN_IN} />}>
            Войти
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={ROUTES.AUTH_SIGN_UP} />}>
            Регистрация
          </DropdownMenuItem>
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
            size="icon-sm"
            className="text-muted-foreground"
            aria-label="Профиль"
            title={label}
          />
        }
      >
        <User />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
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
          Заказы
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={ROUTES.SETTINGS} />}>
          <Settings className="size-4" />
          Настройки
        </DropdownMenuItem>
        {user.sellerProfileId ? (
          <DropdownMenuItem render={<Link href={ROUTES.SELLER} />}>
            <Store className="size-4" />
            Кабинет продавца
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <form action={signOutAction}>
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
