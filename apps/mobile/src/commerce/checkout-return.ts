export type CheckoutHandoffContext = {
  startedAt: number;
  knownOrderIds: string[];
};

export function extractOrderIdFromLotDeepLink(uri: string): string | null {
  const match = uri.trim().match(/^lot:\/\/order\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

export function correlateCheckoutReturnOrder(
  items: Array<Record<string, unknown>>,
  context: CheckoutHandoffContext,
): Record<string, unknown> | null {
  const known = new Set(context.knownOrderIds);
  const graceMs = 5_000;

  const candidates = items.filter((item) => {
    const id = String(item.id ?? "");
    if (!id || known.has(id)) return false;

    const createdAt = Date.parse(String(item.createdAt ?? ""));
    if (Number.isNaN(createdAt)) return false;

    return createdAt >= context.startedAt - graceMs;
  });

  if (candidates.length === 0) return null;

  return candidates.sort((a, b) => {
    const aTime = Date.parse(String(a.createdAt ?? ""));
    const bTime = Date.parse(String(b.createdAt ?? ""));
    return bTime - aTime;
  })[0];
}
