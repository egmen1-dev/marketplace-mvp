export class MarketplaceExecutionForbiddenError extends Error {
  readonly status = 403;

  constructor(message = "Marketplace execution недоступен") {
    super(message);
    this.name = "MarketplaceExecutionForbiddenError";
  }
}

/** Admin-only gate for execution dashboard and task mutations. */
export function assertMarketplaceExecutionAccess(role: string | undefined): void {
  if (role !== "ADMIN") {
    throw new MarketplaceExecutionForbiddenError();
  }
}

/** Sellers may view their own execution actions only. */
export function assertSellerExecutionAccess(role: string | undefined): void {
  if (role !== "SELLER" && role !== "ADMIN") {
    throw new MarketplaceExecutionForbiddenError(
      "Execution actions доступны продавцам и админам",
    );
  }
}
