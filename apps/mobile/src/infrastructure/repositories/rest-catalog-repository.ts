import type { CatalogRepository } from "../../domain/contracts/repositories/index";
import type { CatalogPage, CatalogQuery, Category } from "../../domain/contracts/entities/catalog";
import type { Result } from "../../domain/contracts/result";
import { err, ok } from "../../domain/contracts/result";
import { mapApiErrorToDomain } from "../network/map-api-error";
import type { CommerceTransport } from "../transport/types";
import { mapCatalogPageDto, mapCategoryDto, type CatalogPageDto, type CategoryDto } from "../mappers/commerce-mapper";

export class RestCatalogRepository implements CatalogRepository {
  constructor(private readonly transport: CommerceTransport) {}

  async loadCatalog(query: CatalogQuery): Promise<Result<CatalogPage>> {
    try {
      const search = new URLSearchParams();
      if (query.q) search.set("q", query.q);
      if (query.cursor) search.set("cursor", query.cursor);
      if (query.sort) search.set("sort", query.sort);
      if (query.sellerId) search.set("sellerId", query.sellerId);
      if (query.categoryId) search.set("categoryId", query.categoryId);
      if (query.inStock) search.set("inStock", "1");
      const qs = search.toString();
      const dto = await this.transport.request<CatalogPageDto>(
        { path: `/api/mobile/catalog/products${qs ? `?${qs}` : ""}` },
      );
      return ok(mapCatalogPageDto(dto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async loadCategories(): Promise<Result<ReadonlyArray<Category>>> {
    try {
      const dto = await this.transport.request<{ items: CategoryDto[] }>({ path: "/api/categories" });
      return ok(dto.items.map(mapCategoryDto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }
}
