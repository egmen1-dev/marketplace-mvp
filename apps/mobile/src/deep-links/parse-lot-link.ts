export type DeepLinkRoute =
  | { screen: "home" }
  | { screen: "catalog" }
  | { screen: "favorites" }
  | { screen: "orders" }
  | { screen: "wallet" }
  | { screen: "profile" }
  | { screen: "cart" }
  | { screen: "product"; productId: string }
  | { screen: "order"; orderId: string }
  | { screen: "seller"; sellerId: string }
  | { screen: "sellerBusiness" }
  | { screen: "sellerProducts" }
  | { screen: "sellerSales" }
  | { screen: "sellerPromotion" }
  | { screen: "brainProduct"; productId: string };

const RESERVED_SELLER_SEGMENTS = new Set(["business", "products", "sales", "promotion"]);

export function parseLotDeepLink(uri: string): DeepLinkRoute | null {
  const trimmed = uri.trim();
  if (/^lot:\/\/home\/?$/i.test(trimmed)) return { screen: "home" };
  if (/^lot:\/\/catalog\/?$/i.test(trimmed)) return { screen: "catalog" };
  if (/^lot:\/\/favourites\/?$/i.test(trimmed) || /^lot:\/\/favorites\/?$/i.test(trimmed)) {
    return { screen: "favorites" };
  }
  if (/^lot:\/\/orders\/?$/i.test(trimmed)) return { screen: "orders" };
  if (/^lot:\/\/wallet\/?$/i.test(trimmed)) return { screen: "wallet" };
  if (/^lot:\/\/profile\/?$/i.test(trimmed)) return { screen: "profile" };
  if (/^lot:\/\/cart\/?$/i.test(trimmed)) return { screen: "cart" };

  if (/^lot:\/\/seller\/business\/?$/i.test(trimmed)) return { screen: "sellerBusiness" };
  if (/^lot:\/\/seller\/products\/?$/i.test(trimmed)) return { screen: "sellerProducts" };
  if (/^lot:\/\/seller\/sales\/?$/i.test(trimmed)) return { screen: "sellerSales" };
  if (/^lot:\/\/seller\/promotion\/?$/i.test(trimmed)) return { screen: "sellerPromotion" };

  const product = trimmed.match(/^lot:\/\/product\/([^/?#]+)/i);
  if (product) return { screen: "product", productId: product[1] };

  const order = trimmed.match(/^lot:\/\/order\/([^/?#]+)/i);
  if (order) return { screen: "order", orderId: order[1] };

  const seller = trimmed.match(/^lot:\/\/seller\/([^/?#]+)/i);
  if (seller) {
    const segment = seller[1].toLowerCase();
    if (RESERVED_SELLER_SEGMENTS.has(segment)) return null;
    return { screen: "seller", sellerId: seller[1] };
  }

  const brain = trimmed.match(/^lot:\/\/brain\/product\/([^/?#]+)/i);
  if (brain) return { screen: "brainProduct", productId: brain[1] };

  return null;
}
