import { parseLotDeepLink } from "./parse-lot-link";

function normalizeWebPath(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return url.pathname || "/";
    } catch {
      return null;
    }
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/** Map `lot://` URIs to Expo Router hrefs without opening a browser. */
export function mapLotDeepLinkToHref(uri: string): string | null {
  const parsed = parseLotDeepLink(uri);
  if (!parsed) return null;

  switch (parsed.screen) {
    case "home":
      return "/(tabs)";
    case "catalog":
      return "/(tabs)/catalog";
    case "orders":
      return "/(tabs)/orders";
    case "wallet":
      return "/(tabs)/wallet";
    case "profile":
      return "/(tabs)/profile";
    case "cart":
      return "/cart";
    case "checkout":
      return "/checkout";
    case "product":
    case "brainProduct":
      return `/product/${parsed.productId}`;
    case "order":
      return parsed.orderId
        ? `/order/${parsed.orderId}?checkoutSuccess=1`
        : "/(tabs)/orders?checkoutSuccess=1";
    case "seller":
      return parsed.sellerId
        ? `/seller/${parsed.sellerId}`
        : "/(tabs)/catalog";
    default:
      return null;
  }
}

/** Map web cabinet paths to native routes — used after auth and for +native-intent filtering. */
export function mapWebPathToNativeHref(input: string): string | null {
  const path = normalizeWebPath(input);
  if (!path) return null;

  if (path === "/" || path === "") return "/(tabs)";

  if (/^\/catalog\/?$/i.test(path)) return "/(tabs)/catalog";
  if (/^\/favorites\/?$/i.test(path)) return "/(tabs)/favorites";
  if (/^\/account\/orders\/?$/i.test(path)) return "/(tabs)/orders";
  if (/^\/account\/wallet\/?$/i.test(path)) return "/(tabs)/wallet";
  if (/^\/account\/?$/i.test(path)) return "/(tabs)/profile";

  const product = path.match(/^\/products\/([^/?#]+)/i);
  if (product) return `/product/${product[1]}`;

  const accountOrder = path.match(/^\/account\/orders\/([^/?#]+)/i);
  if (accountOrder) return `/order/${accountOrder[1]}`;

  if (/^\/seller\/products\/?$/i.test(path)) return "/(tabs)/seller-products";
  if (/^\/seller\/orders\/?$/i.test(path)) return "/(tabs)/seller-sales";
  if (/^\/seller\/business\/?$/i.test(path)) return "/(tabs)/seller-home";
  if (/^\/seller\/promotion\/?$/i.test(path)) return "/(tabs)/seller-home";

  const accountProduct = path.match(/^\/account\/products\/([^/?#]+)/i);
  if (accountProduct) return `/product/${accountProduct[1]}`;

  return null;
}
