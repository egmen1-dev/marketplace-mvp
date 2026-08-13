export class MarketplaceCommunicationForbiddenError extends Error {
  readonly status = 403;

  constructor(message = "Marketplace communication недоступен") {
    super(message);
    this.name = "MarketplaceCommunicationForbiddenError";
  }
}

export function assertMarketplaceCommunicationAccess(
  role: string | undefined,
): void {
  if (role !== "ADMIN") {
    throw new MarketplaceCommunicationForbiddenError();
  }
}

export function assertSellerCommunicationView(role: string | undefined): void {
  if (role !== "SELLER" && role !== "ADMIN") {
    throw new MarketplaceCommunicationForbiddenError(
      "Рекомендации ЛОТ доступны продавцам",
    );
  }
}
