import { UserRole } from "@prisma/client";

import { MOBILE_DEEP_LINK_PATTERNS } from "./deep-links";

export const MOBILE_NAVIGATION_CONTRACT_VERSION = "1";

export type MobileNavigationItem = {
  id: string;
  label: string;
  deepLink: string;
  webPath: string;
  roles: Array<"buyer" | "seller">;
};

export type MobileNavigationManifest = {
  version: typeof MOBILE_NAVIGATION_CONTRACT_VERSION;
  role: "guest" | "buyer" | "seller" | "admin";
  items: MobileNavigationItem[];
  advisoryOnly: true;
};

const BUYER_ITEMS: MobileNavigationItem[] = [
  { id: "home", label: "Главная", deepLink: "lot://home", webPath: "/", roles: ["buyer", "seller"] },
  { id: "catalog", label: "Каталог", deepLink: "lot://catalog", webPath: "/catalog", roles: ["buyer", "seller"] },
  { id: "favourites", label: "Избранное", deepLink: "lot://favourites", webPath: "/favorites", roles: ["buyer", "seller"] },
  { id: "orders", label: "Заказы", deepLink: "lot://orders", webPath: "/account/orders", roles: ["buyer", "seller"] },
  { id: "profile", label: "Профиль", deepLink: "lot://profile", webPath: "/account", roles: ["buyer", "seller"] },
];

const SELLER_ITEMS: MobileNavigationItem[] = [
  { id: "business", label: "Бизнес", deepLink: "lot://seller/business", webPath: "/seller/business", roles: ["seller"] },
  { id: "products", label: "Товары", deepLink: "lot://seller/products", webPath: "/seller/products", roles: ["seller"] },
  { id: "sales", label: "Продажи", deepLink: "lot://seller/sales", webPath: "/seller/orders", roles: ["seller"] },
  { id: "promotion", label: "Продвижение", deepLink: "lot://seller/promotion", webPath: "/seller/promotion", roles: ["seller"] },
  { id: "wallet", label: "Кошелёк", deepLink: "lot://wallet", webPath: "/account/wallet", roles: ["seller"] },
];

function isSellerRole(role: UserRole | null | undefined): boolean {
  return role === UserRole.SELLER || role === UserRole.ADMIN;
}

export function buildMobileNavigationManifest(input?: {
  role?: UserRole | null;
  authenticated?: boolean;
}): MobileNavigationManifest {
  const authenticated = input?.authenticated ?? false;
  const role = input?.role ?? null;

  if (!authenticated) {
    return {
      version: MOBILE_NAVIGATION_CONTRACT_VERSION,
      role: "guest",
      items: BUYER_ITEMS.filter((i) => i.id === "home" || i.id === "catalog"),
      advisoryOnly: true,
    };
  }

  if (role === UserRole.ADMIN) {
    return {
      version: MOBILE_NAVIGATION_CONTRACT_VERSION,
      role: "admin",
      items: BUYER_ITEMS,
      advisoryOnly: true,
    };
  }

  if (isSellerRole(role)) {
    return {
      version: MOBILE_NAVIGATION_CONTRACT_VERSION,
      role: "seller",
      items: [...BUYER_ITEMS, ...SELLER_ITEMS],
      advisoryOnly: true,
    };
  }

  return {
    version: MOBILE_NAVIGATION_CONTRACT_VERSION,
    role: "buyer",
    items: BUYER_ITEMS,
    advisoryOnly: true,
  };
}

export function validateNavigationDeepLinks(): boolean {
  const expected = [
    "lot://home",
    "lot://catalog",
    "lot://orders",
    "lot://wallet",
    "lot://profile",
    "lot://seller/business",
  ];
  const patterns = Object.values(MOBILE_DEEP_LINK_PATTERNS);
  return expected.every((link) => patterns.some((p) => p.replace("{id}", "") === link || p === link));
}
