import Link from "next/link";
import { Heart, LayoutGrid, Menu } from "lucide-react";

import { Logo } from "@/components/brand";
import { HeaderSearch } from "@/components/layout/header-search";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthNav, getSessionUser } from "@/features/auth";
import { HeaderCartButton } from "@/features/cart/components";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const navItems = [
  { href: ROUTES.CATALOG, label: "Каталог" },
  { href: ROUTES.SELLER, label: "Продавцу" },
  { href: ROUTES.ORDERS, label: "Заказы" },
] as const;

type SiteHeaderProps = {
  className?: string;
};

export async function SiteHeader({ className }: SiteHeaderProps) {
  const user = await getSessionUser();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Logo variant="responsive" size={36} className="shrink-0" />

        <Button
          size="sm"
          className="hidden shrink-0 rounded-xl md:inline-flex"
          nativeButton={false}
          render={<Link href={ROUTES.CATALOG} />}
        >
          <LayoutGrid data-icon="inline-start" />
          Каталог
        </Button>

        <div className="mx-1 hidden min-w-0 flex-1 md:block lg:mx-4">
          <HeaderSearch variant="bar" />
        </div>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <HeaderSearch variant="icon" className="md:hidden" />

          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label="Избранное"
            title="Избранное — скоро"
            nativeButton={false}
            render={<Link href={ROUTES.CATALOG} />}
          >
            <Heart />
          </Button>

          <HeaderCartButton />

          <ThemeToggle />

          <AuthNav user={user} />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground md:hidden"
                  aria-label="Меню"
                />
              }
            >
              <Menu />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <div className="px-1.5 py-1.5">
                <Logo variant="full" size={28} asLink={false} />
              </div>
              <DropdownMenuSeparator />
              {navItems.map((item) => (
                <DropdownMenuItem
                  key={item.href}
                  render={<Link href={item.href} />}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem render={<Link href={ROUTES.CATALOG} />}>
                <Heart className="size-4" />
                Избранное
              </DropdownMenuItem>
              {!user ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    render={<Link href={ROUTES.AUTH_SIGN_IN} />}
                  >
                    Войти
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={<Link href={ROUTES.AUTH_SIGN_UP} />}
                  >
                    Регистрация
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
