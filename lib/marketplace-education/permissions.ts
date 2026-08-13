export class MarketplaceEducationForbiddenError extends Error {
  readonly status = 403;

  constructor(message = "Marketplace education недоступен") {
    super(message);
    this.name = "MarketplaceEducationForbiddenError";
  }
}

export function assertMarketplaceEducationAccess(role: string | undefined): void {
  if (role !== "ADMIN") {
    throw new MarketplaceEducationForbiddenError();
  }
}

export function assertSellerEducationView(role: string | undefined): void {
  if (role !== "SELLER" && role !== "ADMIN") {
    throw new MarketplaceEducationForbiddenError(
      "Обучающие материалы доступны продавцам",
    );
  }
}

export function assertBuyerEducationView(): void {
  // Buyer education is public on PDP — no role gate required.
}
