const TRUST_VIEWED_KEY = "lot_trust_viewed_products";

export function markTrustViewedOnClient(productId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(TRUST_VIEWED_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.add(productId);
    sessionStorage.setItem(TRUST_VIEWED_KEY, JSON.stringify([...set]));
  } catch {
    // ignore storage errors
  }
}

export function wasTrustViewedOnClient(productId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(TRUST_VIEWED_KEY);
    if (!raw) return false;
    const set = new Set<string>(JSON.parse(raw));
    return set.has(productId);
  } catch {
    return false;
  }
}
