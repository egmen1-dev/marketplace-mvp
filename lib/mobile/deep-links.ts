/** Mobile deep link contract — APK/iOS shell foundation */

export const MOBILE_DEEP_LINK_SCHEME_LOT = "lot";

export const MOBILE_DEEP_LINK_PATTERNS = {
  home: `${MOBILE_DEEP_LINK_SCHEME_LOT}://home`,
  catalog: `${MOBILE_DEEP_LINK_SCHEME_LOT}://catalog`,
  orders: `${MOBILE_DEEP_LINK_SCHEME_LOT}://orders`,
  favourites: `${MOBILE_DEEP_LINK_SCHEME_LOT}://favourites`,
  profile: `${MOBILE_DEEP_LINK_SCHEME_LOT}://profile`,
  product: `${MOBILE_DEEP_LINK_SCHEME_LOT}://product/{id}`,
  order: `${MOBILE_DEEP_LINK_SCHEME_LOT}://order/{id}`,
  seller: `${MOBILE_DEEP_LINK_SCHEME_LOT}://seller/{id}`,
  wallet: `${MOBILE_DEEP_LINK_SCHEME_LOT}://wallet`,
  brainProduct: `${MOBILE_DEEP_LINK_SCHEME_LOT}://brain/product/{id}`,
  business: `${MOBILE_DEEP_LINK_SCHEME_LOT}://seller/business`,
  products: `${MOBILE_DEEP_LINK_SCHEME_LOT}://seller/products`,
  sales: `${MOBILE_DEEP_LINK_SCHEME_LOT}://seller/sales`,
  promotion: `${MOBILE_DEEP_LINK_SCHEME_LOT}://seller/promotion`,
} as const;

export type DeepLinkDestination =
  | { type: "home"; webPath: string }
  | { type: "catalog"; webPath: string }
  | { type: "orders"; webPath: string }
  | { type: "favourites"; webPath: string }
  | { type: "profile"; webPath: string }
  | { type: "business"; webPath: string }
  | { type: "products"; webPath: string }
  | { type: "sales"; webPath: string }
  | { type: "promotion"; webPath: string }
  | { type: "product"; productId: string; webPath: string }
  | { type: "order"; orderId: string; webPath: string }
  | { type: "seller"; sellerId: string; webPath: string }
  | { type: "wallet"; webPath: string }
  | { type: "brain_product"; productId: string; webPath: string };

export function resolveMobileDeepLink(uri: string): DeepLinkDestination | null {
  const trimmed = uri.trim();

  if (/^lot:\/\/home\/?$/i.test(trimmed)) {
    return { type: "home", webPath: "/" };
  }
  if (/^lot:\/\/catalog\/?$/i.test(trimmed)) {
    return { type: "catalog", webPath: "/catalog" };
  }
  if (/^lot:\/\/orders\/?$/i.test(trimmed)) {
    return { type: "orders", webPath: "/account/orders" };
  }
  if (/^lot:\/\/favourites\/?$/i.test(trimmed)) {
    return { type: "favourites", webPath: "/favorites" };
  }
  if (/^lot:\/\/profile\/?$/i.test(trimmed)) {
    return { type: "profile", webPath: "/account" };
  }
  if (/^lot:\/\/seller\/business\/?$/i.test(trimmed)) {
    return { type: "business", webPath: "/seller/business" };
  }
  if (/^lot:\/\/seller\/products\/?$/i.test(trimmed)) {
    return { type: "products", webPath: "/seller/products" };
  }
  if (/^lot:\/\/seller\/sales\/?$/i.test(trimmed)) {
    return { type: "sales", webPath: "/seller/orders" };
  }
  if (/^lot:\/\/seller\/promotion\/?$/i.test(trimmed)) {
    return { type: "promotion", webPath: "/seller/promotion" };
  }

  const lotProduct = trimmed.match(/^lot:\/\/product\/([^/?#]+)/i);
  if (lotProduct) {
    return { type: "product", productId: lotProduct[1], webPath: `/products/${lotProduct[1]}` };
  }

  const lotOrder = trimmed.match(/^lot:\/\/order\/([^/?#]+)/i);
  if (lotOrder) {
    return { type: "order", orderId: lotOrder[1], webPath: `/account/orders/${lotOrder[1]}` };
  }

  const lotSeller = trimmed.match(/^lot:\/\/seller\/([^/?#]+)/i);
  if (lotSeller) {
    return { type: "seller", sellerId: lotSeller[1], webPath: `/sellers/${lotSeller[1]}` };
  }

  if (/^lot:\/\/wallet\/?$/i.test(trimmed)) {
    return { type: "wallet", webPath: "/account/wallet" };
  }

  const lotBrain = trimmed.match(/^lot:\/\/brain\/product\/([^/?#]+)/i);
  if (lotBrain) {
    return {
      type: "brain_product",
      productId: lotBrain[1],
      webPath: `/account/products/${lotBrain[1]}`,
    };
  }

  const httpsProduct = trimmed.match(/\/products\/([^/?#]+)/i);
  if (httpsProduct) {
    return { type: "product", productId: httpsProduct[1], webPath: `/products/${httpsProduct[1]}` };
  }

  return null;
}
