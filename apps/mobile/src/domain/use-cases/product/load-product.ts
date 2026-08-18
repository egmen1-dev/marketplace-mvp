import type { ProductDetail } from "../../contracts/entities/catalog";
import type { ProductId } from "../../contracts/value-objects/ids";
import type { DomainError } from "../../contracts/errors";
import type { ProductRepository } from "../../contracts/repositories/index";
import type { Result } from "../../contracts/result";
import type { QueryUseCase } from "../../contracts/use-cases/index";

export class LoadProduct implements QueryUseCase<{ productId: ProductId }, ProductDetail> {
  constructor(private readonly productRepository: ProductRepository) {}

  execute(input: { productId: ProductId }): Promise<Result<ProductDetail, DomainError>> {
    return this.productRepository.loadProduct(input.productId);
  }
}
