export class PaymentServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "PaymentServiceError";
  }
}

export const PAYMENTS_NOT_CONFIGURED =
  "Платежи не настроены. Укажите STRIPE_SECRET_KEY в окружении.";
