import Link from "next/link";

import { Logo } from "@/components/brand";
import { Separator } from "@/components/ui/separator";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const footerLinks = [
  {
    title: "Покупателям",
    items: [
      { href: ROUTES.CATALOG, label: "Каталог" },
      { href: ROUTES.CATEGORIES, label: "Категории" },
      { href: ROUTES.CART, label: "Корзина" },
      { href: ROUTES.ORDERS, label: "Заказы" },
    ],
  },
  {
    title: "Продавцам",
    items: [
      { href: ROUTES.SELLER, label: "Кабинет" },
      { href: ROUTES.SELL, label: "Как продавать" },
    ],
  },
  {
    title: "Компания",
    items: [
      { href: ROUTES.ABOUT, label: "О нас" },
      { href: ROUTES.SUPPORT, label: "Поддержка" },
      { href: ROUTES.CONTACTS, label: "Контакты" },
    ],
  },
] as const;

type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer
      className={cn(
        "mt-auto border-t border-border bg-surface",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <Logo variant="full" size={32} />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Современный маркетплейс — покупайте и продавайте в одном месте.
            </p>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title} className="flex flex-col gap-3">
              <h3 className="font-heading text-sm font-medium text-foreground">
                {group.title}
              </h3>
              <ul className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <li key={`${group.title}-${item.label}`}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors duration-[var(--duration-fast)] hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {APP_NAME}. Все права защищены.
          </p>
          <div className="flex gap-4">
            <Link
              href={ROUTES.PRIVACY}
              className="transition-colors hover:text-foreground"
            >
              Политика
            </Link>
            <Link
              href={ROUTES.TERMS}
              className="transition-colors hover:text-foreground"
            >
              Условия
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
