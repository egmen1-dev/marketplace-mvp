import Link from "next/link";
import { Heart, LayoutGrid, Menu, Search } from "lucide-react";

import { Logo } from "@/components/brand";
import { headerActionClassName } from "@/components/layout/header-action";
import { HeaderSearch } from "@/components/layout/header-search";
import { MobileMenuThemeItem } from "@/components/layout/mobile-menu-theme-item";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthNav, getSessionUser, type SessionUser } from "@/features/auth";
import { HeaderCartButton } from "@/features/cart/components";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const menuLinks = [
  { href: ROUTES.SELL, label: "Продавать" },
  { href: ROUTES.ORDERS, label: "Заказы" },
  { href: ROUTES.CATEGORIES, label: "Категории" },
] as const;

type SiteHeaderProps = {
  className?: string;
  /** When provided by layout, skips a second session read. */
  user?: SessionUser | null;
};

export async function SiteHeader({ className, user: userProp }: SiteHeaderProps) {
  const user =
    userProp !== undefined ? userProp : await getSessionUser();

  return (
    <header
      data-testid="site-header"
      className={cn(
        "sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <Logo variant="responsive" size={36} className="shrink-0" />

        <Button
          size="sm"
          className="shrink-0 rounded-xl"
          nativeButton={false}
          render={<Link href={ROUTES.CATALOG} />}
          data-testid="header-catalog"
        >
          <LayoutGrid data-icon="inline-start" />
          Каталог
        </Button>

        {/* Bounded search width — avoids a huge empty gap before actions */}
        <div className="mx-1 hidden min-w-0 flex-1 md:block md:max-w-md lg:mx-3 lg:max-w-lg xl:max-w-xl">
          <HeaderSearch variant="bar" />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <Button
            variant="ghost"
            size="icon-header"
            className={headerActionClassName("hidden md:inline-flex")}
            aria-label="Избранное"
            title="Избранное"
            nativeButton={false}
            render={<Link href={ROUTES.FAVORITES} />}
            data-testid="header-favorites"
          >
            <Heart />
          </Button>

          <HeaderCartButton />

          <ThemeToggle className="hidden md:inline-flex" />

          <AuthNav user={user} />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-header"
                  className={headerActionClassName("md:hidden")}
                  aria-label="Меню"
                  title="Меню"
                  data-testid="header-mobile-menu"
                />
              }
            >
              <Menu />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <div className="px-1.5 py-1.5">
                <Logo variant="full" size={28} asLink={false} />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link href={ROUTES.CATALOG} />}
                data-testid="mobile-nav-catalog"
              >
                <Search className="size-4" />
                Поиск
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href={ROUTES.FAVORITES} />}
                data-testid="mobile-nav-favorites"
              >
                <Heart className="size-4" />
                Избранное
              </DropdownMenuItem>
              {menuLinks.map((item) => (
                <DropdownMenuItem
                  key={item.href}
                  render={<Link href={item.href} />}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <MobileMenuThemeItem />
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
