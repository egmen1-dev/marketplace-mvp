import type {
  SellerHomeDashboard,
  SellerOrderPage,
  SellerProductPage,
  SellerPublicProfile,
} from "../../contracts/entities/seller";
import type { SellerId } from "../../contracts/value-objects/ids";
import type { DomainError } from "../../contracts/errors";
import type { SellerRepository } from "../../contracts/repositories/index";
import type { DomainEventBus } from "../../contracts/events";
import type { Result } from "../../contracts/result";
import type { QueryUseCase } from "../../contracts/use-cases/index";

export class LoadSellerHome implements QueryUseCase<Record<string, never>, SellerHomeDashboard> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(_input: Record<string, never>): Promise<Result<SellerHomeDashboard, DomainError>> {
    return this.sellerRepository.loadSellerHome();
  }
}

export class LoadSellerProducts implements QueryUseCase<{ cursor?: string | null; query?: string }, SellerProductPage> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(input: { cursor?: string | null; query?: string }): Promise<Result<SellerProductPage, DomainError>> {
    return this.sellerRepository.loadSellerProducts(input);
  }
}

export class LoadSellerOrders implements QueryUseCase<{ cursor?: string | null }, SellerOrderPage> {
  constructor(
    private readonly sellerRepository: SellerRepository,
    private readonly events: DomainEventBus,
  ) {}

  async execute(input: { cursor?: string | null }): Promise<Result<SellerOrderPage, DomainError>> {
    const result = await this.sellerRepository.loadSellerOrders(input);
    if (result.ok && result.value.items[0]) {
      this.events.publish({
        type: "SellerOrderChanged",
        order: result.value.items[0],
        change: "updated",
      });
    }
    return result;
  }
}

export class LoadSellerPublicProfile implements QueryUseCase<{ sellerId: SellerId }, SellerPublicProfile> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(input: { sellerId: SellerId }): Promise<Result<SellerPublicProfile, DomainError>> {
    return this.sellerRepository.loadPublicProfile(input.sellerId);
  }
}
