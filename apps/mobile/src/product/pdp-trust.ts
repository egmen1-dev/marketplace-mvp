const UNSUPPORTED_SELLER_TRUST_PATTERNS = [
  /быстро отвечает/i,
  /проверенный продавец/i,
  /доставка сегодня/i,
  /поддержка 24\/7/i,
] as const;

export function isUnsupportedSellerTrustLabel(label: string): boolean {
  return UNSUPPORTED_SELLER_TRUST_PATTERNS.some((pattern) => pattern.test(label));
}

export function filterTruthfulSellerBadges(badges: string[]): string[] {
  return badges.filter((badge) => !isUnsupportedSellerTrustLabel(badge));
}
