export class FinanceError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "INVALID_STATE"
      | "ALREADY_EXISTS",
    message: string,
  ) {
    super(message);
    this.name = "FinanceError";
  }
}

export class FinanceForbiddenError extends FinanceError {
  constructor(message = "Недостаточно прав") {
    super("FORBIDDEN", message);
    this.name = "FinanceForbiddenError";
  }
}
