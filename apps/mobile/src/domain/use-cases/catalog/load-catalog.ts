import type { CatalogQuery, CatalogPage } from "../../contracts/entities/catalog";
import type { Category } from "../../contracts/entities/catalog";
import type { DomainError } from "../../contracts/errors";
import type { CatalogRepository } from "../../contracts/repositories/index";
import type { Result } from "../../contracts/result";
import type { QueryUseCase } from "../../contracts/use-cases/index";

export class LoadCatalog implements QueryUseCase<CatalogQuery, CatalogPage> {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  execute(input: CatalogQuery): Promise<Result<CatalogPage, DomainError>> {
    return this.catalogRepository.loadCatalog(input);
  }
}

export class LoadCategories implements QueryUseCase<Record<string, never>, ReadonlyArray<Category>> {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  execute(_input: Record<string, never>): Promise<Result<ReadonlyArray<Category>, DomainError>> {
    return this.catalogRepository.loadCategories();
  }
}
