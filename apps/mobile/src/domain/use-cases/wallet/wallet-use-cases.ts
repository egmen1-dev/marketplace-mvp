import type { DeliveryQuote, DeliveryRequest, PickupPoint } from "../../contracts/entities/checkout";
import type { WalletBalance } from "../../contracts/entities/wallet";
import type { DomainError } from "../../contracts/errors";
import type { CheckoutRepository, WalletRepository } from "../../contracts/repositories/index";
import type { DomainEventBus } from "../../contracts/events";
import type { Result } from "../../contracts/result";
import type { QueryUseCase } from "../../contracts/use-cases/index";

export class QuoteCheckoutDelivery implements QueryUseCase<DeliveryRequest, DeliveryQuote> {
  constructor(private readonly checkoutRepository: CheckoutRepository) {}

  execute(input: DeliveryRequest): Promise<Result<DeliveryQuote, DomainError>> {
    return this.checkoutRepository.quoteDelivery(input);
  }
}

export class LoadPickupPoints implements QueryUseCase<{ city: string }, ReadonlyArray<PickupPoint>> {
  constructor(private readonly checkoutRepository: CheckoutRepository) {}

  execute(input: { city: string }): Promise<Result<ReadonlyArray<PickupPoint>, DomainError>> {
    return this.checkoutRepository.loadPickupPoints(input.city);
  }
}

export class LoadWallet implements QueryUseCase<Record<string, never>, WalletBalance> {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly events: DomainEventBus,
  ) {}

  async execute(_input: Record<string, never>): Promise<Result<WalletBalance, DomainError>> {
    const result = await this.walletRepository.loadWallet();
    if (result.ok) {
      this.events.publish({ type: "WalletChanged", balance: result.value });
    }
    return result;
  }
}
