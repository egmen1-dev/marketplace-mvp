import type { DeepLinkRoute } from "./parse-lot-link";

export type DeepLinkTarget =
  | string
  | {
      pathname: "/seller/[id]";
      params: { id: string };
    };

/** Pure routing table — used by routeDeepLink and automated tests. */
export function resolveDeepLinkTarget(parsed: DeepLinkRoute): DeepLinkTarget {
  switch (parsed.screen) {
    case "home":
      return "/(tabs)";
    case "catalog":
      return "/(tabs)/catalog";
    case "favorites":
      return "/(tabs)/favorites";
    case "orders":
      return "/(tabs)/orders";
    case "wallet":
      return "/(tabs)/wallet";
    case "profile":
      return "/(tabs)/profile";
    case "cart":
      return "/cart";
    case "product":
    case "brainProduct":
      return `/product/${parsed.productId}`;
    case "order":
      return `/order/${parsed.orderId}`;
    case "seller":
      return { pathname: "/seller/[id]", params: { id: parsed.sellerId } };
    case "sellerBusiness":
      return "/(tabs)/seller-home";
    case "sellerProducts":
      return "/(tabs)/seller-products";
    case "sellerSales":
      return "/(tabs)/seller-sales";
    case "sellerPromotion":
      return "/(tabs)/seller-home";
    default:
      return "/(tabs)";
  }
}

export function deepLinkTargetToHref(target: DeepLinkTarget): string {
  if (typeof target === "string") return target;
  return `/seller/${encodeURIComponent(target.params.id)}`;
}
