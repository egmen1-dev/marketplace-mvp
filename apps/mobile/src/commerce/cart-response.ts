export type CartLine = { productId: string; quantity: number };

export function extractCartLines(cart: Record<string, unknown> | null | undefined): CartLine[] {
  const items = cart?.items;
  if (!Array.isArray(items)) return [];

  const lines: CartLine[] = [];
  for (const row of items) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const nestedProduct =
      record.product && typeof record.product === "object" ? (record.product as Record<string, unknown>) : null;
    const productId =
      typeof record.productId === "string"
        ? record.productId
        : typeof nestedProduct?.id === "string"
          ? nestedProduct.id
          : null;
    const quantity = typeof record.quantity === "number" ? record.quantity : 0;
    if (productId) lines.push({ productId, quantity });
  }
  return lines;
}

export function resolveCartProductQuantity(
  cart: Record<string, unknown> | null | undefined,
  productId: string,
): number | null {
  const lines = extractCartLines(cart);
  if (lines.length === 0 && cart && !Array.isArray(cart.items)) return null;
  return lines.find((line) => line.productId === productId)?.quantity ?? 0;
}
