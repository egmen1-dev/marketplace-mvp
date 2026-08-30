export type DeepLinkRoute =
  | { screen: "home" }
  | { screen: "catalog" }
  | { screen: "orders" }
  | { screen: "wallet" }
  | { screen: "profile" }
  | { screen: "cart" }
  | { screen: "checkout" }
  | { screen: "product"; productId: string }
  | { screen: "order"; orderId: string }
  | { screen: "seller"; sellerId: string }
  | { screen: "brainProduct"; productId: string };

export function parseLotDeepLink(uri: string): DeepLinkRoute | null {
  const trimmed = uri.trim();
  if (/^lot:\/\/home\/?$/i.test(trimmed)) return { screen: "home" };
  if (/^lot:\/\/catalog\/?$/i.test(trimmed)) return { screen: "catalog" };
  if (/^lot:\/\/orders\/?$/i.test(trimmed)) return { screen: "orders" };
  if (/^lot:\/\/wallet\/?$/i.test(trimmed)) return { screen: "wallet" };
  if (/^lot:\/\/profile\/?$/i.test(trimmed)) return { screen: "profile" };
  if (/^lot:\/\/cart\/?$/i.test(trimmed)) return { screen: "cart" };
  if (/^lot:\/\/\/?checkout\/?$/i.test(trimmed)) return { screen: "checkout" };

  const product = trimmed.match(/^lot:\/\/product\/([^/?#]+)/i);
  if (product) return { screen: "product", productId: product[1] };

  const order = trimmed.match(/^lot:\/\/order\/([^/?#]+)/i);
  if (order) return { screen: "order", orderId: order[1] };

  const seller = trimmed.match(/^lot:\/\/seller\/([^/?#]+)/i);
  if (seller) return { screen: "seller", sellerId: seller[1] };

  const brain = trimmed.match(/^lot:\/\/brain\/product\/([^/?#]+)/i);
  if (brain) return { screen: "brainProduct", productId: brain[1] };

  return null;
}
