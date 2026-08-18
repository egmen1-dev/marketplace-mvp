import type { ProductDetail, ProductSummary, CatalogPage } from "../../contracts/entities/catalog";
import type { ProductId, CategoryId } from "../../contracts/value-objects/ids";
import type { DomainError } from "../../contracts/errors";
import type { ProductRepository, CatalogRepository } from "../../contracts/repositories/index";
import type { Result } from "../../contracts/result";
import type { QueryUseCase } from "../../contracts/use-cases/index";

export class LoadRelatedProducts implements QueryUseCase<{ productId: ProductId; categoryId?: CategoryId | null }, ReadonlyArray<ProductSummary>> {
  constructor(
    private readonly catalogRepository: CatalogRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(input: { productId: ProductId; categoryId?: CategoryId | null }): Promise<Result<ReadonlyArray<ProductSummary>, DomainError>> {
    if (input.categoryId) {
      const page = await this.catalogRepository.loadCatalog({ sort: "popular", categoryId: input.categoryId });
      if (!page.ok) return page;
      return { ok: true, value: page.value.items.filter((item) => item.id !== input.productId).slice(0, 8) };
    }
    return this.productRepository.loadRelated(input.productId);
  }
}

export class LoadSellerCatalogCount implements QueryUseCase<{ sellerId: import("../../contracts/value-objects/ids").SellerId }, number> {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async execute(input: { sellerId: import("../../contracts/value-objects/ids").SellerId }): Promise<Result<number, DomainError>> {
    const page = await this.catalogRepository.loadCatalog({ sellerId: input.sellerId, sort: "popular" });
    if (!page.ok) return page;
    return { ok: true, value: page.value.items.length + (page.value.nextCursor ? 1 : 0) };
  }
}

export class LoadProductDetail implements QueryUseCase<{ productId: ProductId }, ProductDetail> {
  constructor(private readonly productRepository: ProductRepository) {}

  execute(input: { productId: ProductId }): Promise<Result<ProductDetail, DomainError>> {
    return this.productRepository.loadProduct(input.productId);
  }
}

export class LoadCatalogPage implements QueryUseCase<import("../../contracts/entities/catalog").CatalogQuery, CatalogPage> {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  execute(input: import("../../contracts/entities/catalog").CatalogQuery): Promise<Result<CatalogPage, DomainError>> {
    return this.catalogRepository.loadCatalog(input);
  }
}
