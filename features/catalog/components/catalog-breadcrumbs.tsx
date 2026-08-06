import Link from "next/link";

import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type CatalogBreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function CatalogBreadcrumbs({
  items,
  className,
}: CatalogBreadcrumbsProps) {
  const crumbs: BreadcrumbItem[] = [
    { label: "Главная", href: ROUTES.HOME },
    ...items,
  ];

  return (
    <nav aria-label="Хлебные крошки" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        {crumbs.map((item, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? (
                <span aria-hidden className="text-border">
                  /
                </span>
              ) : null}
              {last || !item.href ? (
                <span
                  className={cn(last && "font-medium text-foreground")}
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
