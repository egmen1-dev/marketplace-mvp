import type {
  SellerHomeDashboard,
  SellerOrderDetail,
  SellerOrderFilter,
  SellerOrderPage,
  SellerOrdersSummary,
  SellerProductDetail,
  SellerProductFilter,
  SellerProductPage,
  SellerProductSort,
  SellerProductsSummary,
  SellerPublicProfile,
} from "../../contracts/entities/seller";
import type { OrderId, ProductId, SellerId } from "../../contracts/value-objects/ids";
import type { DomainError } from "../../contracts/errors";
import type { SellerRepository } from "../../contracts/repositories/index";
import type { Result } from "../../contracts/result";
import type { QueryUseCase } from "../../contracts/use-cases/index";
import { orderId, productId } from "../../contracts/value-objects/ids";

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

export type LoadSellerOrdersInput = {
  cursor?: string | null;
  query?: string | null;
  filter?: SellerOrderFilter;
};

export class LoadSellerOrders implements QueryUseCase<LoadSellerOrdersInput, SellerOrderPage> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(input: LoadSellerOrdersInput): Promise<Result<SellerOrderPage, DomainError>> {
    return this.sellerRepository.loadSellerOrders(input);
  }
}

export class LoadSellerOrdersSummary implements QueryUseCase<Record<string, never>, SellerOrdersSummary> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(_input: Record<string, never>): Promise<Result<SellerOrdersSummary, DomainError>> {
    return this.sellerRepository.loadSellerOrdersSummary();
  }
}

export class LoadSellerOrderDetail implements QueryUseCase<{ orderId: OrderId }, SellerOrderDetail> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(input: { orderId: OrderId }): Promise<Result<SellerOrderDetail, DomainError>> {
    return this.sellerRepository.loadSellerOrderDetail(input.orderId);
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

export function extractOrderIdFromActionPayload(
  payload: Readonly<Record<string, string | number | boolean | null>>,
): OrderId | null {
  const raw = payload.orderId;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return orderId(raw);
}
