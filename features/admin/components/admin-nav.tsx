"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LineChart,
  Compass,
  FolderTree,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Share2,
  Rocket,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Store,
  Ticket,
  Truck,
  Upload,
  Users,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

const NAV_ITEMS = [
  {
    href: ROUTES.ADMIN,
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname === ROUTES.ADMIN,
  },
  {
    href: ROUTES.ADMIN_DASHBOARD,
    label: "UX Overview",
    icon: Sparkles,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_DASHBOARD),
  },
  {
    href: ROUTES.ADMIN_SYSTEM_FLAGS,
    label: "System Flags",
    icon: ShieldAlert,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_SYSTEM_FLAGS),
  },
  {
    href: ROUTES.ADMIN_TRUST_CENTER,
    label: "Trust Center",
    icon: ShieldCheck,
    match: (pathname: string) =>
      pathname.startsWith(ROUTES.ADMIN_TRUST_CENTER) ||
      pathname.startsWith(ROUTES.ADMIN_TRUST),
  },
  {
    href: ROUTES.ADMIN_MODERATION,
    label: "Moderation",
    icon: Shield,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_MODERATION),
  },
  {
    href: ROUTES.ADMIN_DELIVERY,
    label: "Delivery",
    icon: Truck,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_DELIVERY),
  },
  {
    href: ROUTES.ADMIN_FOUNDATION,
    label: "Foundation",
    icon: ShieldCheck,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_FOUNDATION),
  },
  {
    href: ROUTES.ADMIN_OPERATIONS,
    label: "Operations",
    icon: Shield,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_OPERATIONS),
  },
  {
    href: ROUTES.ADMIN_LAUNCH,
    label: "Launch",
    icon: Rocket,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_LAUNCH),
  },
  {
    href: ROUTES.ADMIN_DISCOVERY,
    label: "Discovery",
    icon: Compass,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_DISCOVERY),
  },
  {
    href: ROUTES.ADMIN_RANKING,
    label: "Ranking",
    icon: LineChart,
    match: (pathname: string) =>
      pathname.startsWith(ROUTES.ADMIN_RANKING) &&
      !pathname.startsWith(ROUTES.ADMIN_CONTENT_QUALITY),
  },
  {
    href: ROUTES.ADMIN_CONTENT_QUALITY,
    label: "Content Quality",
    icon: Search,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_CONTENT_QUALITY),
  },
  {
    href: ROUTES.ADMIN_SOCIAL_GROWTH,
    label: "Social Growth",
    icon: Share2,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_SOCIAL_GROWTH),
  },
  {
    href: ROUTES.ADMIN_HEALTH,
    label: "Health",
    icon: LineChart,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_HEALTH),
  },
  {
    href: ROUTES.ADMIN_PAYMENTS,
    label: "Payments",
    icon: Wallet,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_PAYMENTS),
  },
  {
    href: ROUTES.ADMIN_UX_HEALTH,
    label: "UX Health",
    icon: Search,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_UX_HEALTH),
  },
  {
    href: ROUTES.ADMIN_USERS,
    label: "Пользователи",
    icon: Users,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_USERS),
  },
  {
    href: ROUTES.ADMIN_SELLERS,
    label: "Продавцы",
    icon: Store,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_SELLERS),
  },
  {
    href: ROUTES.ADMIN_PRODUCTS,
    label: "Товары",
    icon: Package,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_PRODUCTS),
  },
  {
    href: ROUTES.ADMIN_ORDERS,
    label: "Заказы",
    icon: ShoppingBag,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_ORDERS),
  },
  {
    href: ROUTES.ADMIN_FINANCE,
    label: "Finance",
    icon: Wallet,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_FINANCE),
  },
  {
    href: ROUTES.ADMIN_FINANCIAL_INCIDENTS,
    label: "Incidents",
    icon: ShieldAlert,
    match: (pathname: string) =>
      pathname.startsWith(ROUTES.ADMIN_FINANCIAL_INCIDENTS),
  },
  {
    href: ROUTES.ADMIN_PAYOUTS,
    label: "Payouts",
    icon: Wallet,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_PAYOUTS),
  },
  {
    href: ROUTES.ADMIN_ADS,
    label: "Ads readiness",
    icon: Megaphone,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_ADS),
  },
  {
    href: ROUTES.ADMIN_ANALYTICS,
    label: "Analytics",
    icon: BarChart3,
    match: (pathname: string) =>
      pathname.startsWith(ROUTES.ADMIN_ANALYTICS),
  },
  {
    href: ROUTES.ADMIN_CONVERSION,
    label: "Conversion",
    icon: LineChart,
    match: (pathname: string) =>
      pathname.startsWith(ROUTES.ADMIN_CONVERSION),
  },
  {
    href: ROUTES.ADMIN_RESERVATIONS,
    label: "Брони",
    icon: Ticket,
    match: (pathname: string) =>
      pathname.startsWith(ROUTES.ADMIN_RESERVATIONS),
  },
  {
    href: ROUTES.ADMIN_MESSAGES,
    label: "Чаты",
    icon: MessageCircle,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_MESSAGES),
  },
  {
    href: ROUTES.ADMIN_CATEGORIES,
    label: "Категории",
    icon: FolderTree,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_CATEGORIES),
  },
  {
    href: ROUTES.ADMIN_TAXONOMY_IMPORT,
    label: "Taxonomy Import",
    icon: Upload,
    match: (pathname: string) =>
      pathname.startsWith(ROUTES.ADMIN_TAXONOMY_IMPORT),
  },
  {
    href: ROUTES.ADMIN_SEO,
    label: "SEO",
    icon: Search,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_SEO),
  },
  {
    href: ROUTES.ADMIN_AI_UNDERSTANDING,
    label: "AI Understanding",
    icon: Sparkles,
    match: (pathname: string) =>
      pathname.startsWith(ROUTES.ADMIN_AI_UNDERSTANDING),
  },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Админ-панель"
      className="flex flex-col gap-1 sm:sticky sm:top-20"
    >
      <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Админ
      </p>
      <div className="flex flex-row gap-1 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
