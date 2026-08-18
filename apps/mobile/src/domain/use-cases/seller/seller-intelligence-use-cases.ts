import type { SellerIntelligenceDashboard } from "../../contracts/entities/seller";
import type { DomainError } from "../../contracts/errors";
import type { SellerRepository } from "../../contracts/repositories/index";
import type { Result } from "../../contracts/result";
import type { QueryUseCase } from "../../contracts/use-cases/index";

export class LoadSellerIntelligence implements QueryUseCase<Record<string, never>, SellerIntelligenceDashboard> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(_input: Record<string, never>): Promise<Result<SellerIntelligenceDashboard, DomainError>> {
    return this.sellerRepository.loadSellerIntelligence();
  }
}
