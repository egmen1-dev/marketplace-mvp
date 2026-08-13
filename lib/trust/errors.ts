export class TrustError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "INVALID_STATE"
      | "VALIDATION",
    message: string,
  ) {
    super(message);
    this.name = "TrustError";
  }
}
