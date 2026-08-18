import type {
  SellerHomeDashboard,
  SellerOrderPage,
  SellerProductDetail,
  SellerProductFilter,
  SellerProductPage,
  SellerProductSort,
  SellerProductsSummary,
  SellerPublicProfile,
} from "../../contracts/entities/seller";
import type { ProductId, SellerId } from "../../contracts/value-objects/ids";
import type { DomainError } from "../../contracts/errors";
import type { SellerRepository } from "../../contracts/repositories/index";
import type { DomainEventBus } from "../../contracts/events";
import type { Result } from "../../contracts/result";
import type { QueryUseCase } from "../../contracts/use-cases/index";
import { productId } from "../../contracts/value-objects/ids";

export class LoadSellerHome implements QueryUseCase<Record<string, never>, SellerHomeDashboard> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(_input: Record<string, never>): Promise<Result<SellerHomeDashboard, DomainError>> {
    return this.sellerRepository.loadSellerHome();
  }
}

export type LoadSellerProductsInput = {
  cursor?: string | null;
  query?: string | null;
  filter?: SellerProductFilter;
  sort?: SellerProductSort;
};

export class LoadSellerProducts implements QueryUseCase<LoadSellerProductsInput, SellerProductPage> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(input: LoadSellerProductsInput): Promise<Result<SellerProductPage, DomainError>> {
    return this.sellerRepository.loadSellerProducts(input);
  }
}

export class LoadSellerProductsSummary implements QueryUseCase<Record<string, never>, SellerProductsSummary> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(_input: Record<string, never>): Promise<Result<SellerProductsSummary, DomainError>> {
    return this.sellerRepository.loadSellerProductsSummary();
  }
}

export class LoadSellerProductDetail implements QueryUseCase<{ productId: ProductId }, SellerProductDetail> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(input: { productId: ProductId }): Promise<Result<SellerProductDetail, DomainError>> {
    return this.sellerRepository.loadSellerProductDetail(input.productId);
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

export function extractProductIdFromActionPayload(
  payload: Readonly<Record<string, string | number | boolean | null>>,
): ProductId | null {
  const raw = payload.productId;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return productId(raw);
}
