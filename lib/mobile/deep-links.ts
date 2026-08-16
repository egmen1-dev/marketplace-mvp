/** Mobile deep link contract — APK/iOS shell foundation */

export const MOBILE_DEEP_LINK_SCHEME_LOT = "lot";

export const MOBILE_DEEP_LINK_PATTERNS = {
  product: `${MOBILE_DEEP_LINK_SCHEME_LOT}://product/{id}`,
  order: `${MOBILE_DEEP_LINK_SCHEME_LOT}://order/{id}`,
  seller: `${MOBILE_DEEP_LINK_SCHEME_LOT}://seller/{id}`,
  wallet: `${MOBILE_DEEP_LINK_SCHEME_LOT}://wallet`,
  brainProduct: `${MOBILE_DEEP_LINK_SCHEME_LOT}://brain/product/{id}`,
} as const;

export type DeepLinkDestination =
  | { type: "product"; productId: string; webPath: string }
  | { type: "order"; orderId: string; webPath: string }
  | { type: "seller"; sellerId: string; webPath: string }
  | { type: "wallet"; webPath: string }
  | { type: "brain_product"; productId: string; webPath: string };

export function resolveMobileDeepLink(uri: string): DeepLinkDestination | null {
  const trimmed = uri.trim();

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
