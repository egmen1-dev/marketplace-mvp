import Link from "next/link";
import { Heart, Menu } from "lucide-react";

import { CatalogMenu } from "@/components/layout/catalog-menu";
import { HeaderSearch } from "@/components/layout/header-search";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthNav, getSessionUser } from "@/features/auth";
import { listCategoryTree } from "@/features/catalog/queries";
import { HeaderCartButton } from "@/features/cart/components";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const navItems = [
  { href: ROUTES.CATALOG, label: "Каталог" },
  { href: ROUTES.CATEGORIES, label: "Категории" },
  { href: ROUTES.SELLER, label: "Продавцу" },
  { href: ROUTES.ORDERS, label: "Заказы" },
] as const;

type SiteHeaderProps = {
  className?: string;
};

export async function SiteHeader({ className }: SiteHeaderProps) {
  const user = await getSessionUser();
  let categoryTree: Awaited<ReturnType<typeof listCategoryTree>> = [];
  try {
    categoryTree = await listCategoryTree({ activeOnly: true });
  } catch (err) {
    console.error("[SiteHeader] categories", err);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Link
          href={ROUTES.HOME}
          className="group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-glow"
          >
            Л
          </span>
          <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
            {APP_NAME}
          </span>
        </Link>

        <CatalogMenu tree={categoryTree} />

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
            title="Избранное"
            nativeButton={false}
            render={<Link href={ROUTES.FAVORITES} />}
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
              <DropdownMenuLabel>Навигация</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {navItems.map((item) => (
                <DropdownMenuItem
                  key={item.href}
                  render={<Link href={item.href} />}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem render={<Link href={ROUTES.FAVORITES} />}>
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
