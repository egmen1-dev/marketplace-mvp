import type { ProductRepository } from "../../domain/contracts/repositories/index";
import type { ProductDetail, ProductSummary } from "../../domain/contracts/entities/catalog";
import type { ProductId } from "../../domain/contracts/value-objects/ids";
import type { Result } from "../../domain/contracts/result";
import { err, ok } from "../../domain/contracts/result";
import { mapApiErrorToDomain } from "../network/map-api-error";
import type { CommerceTransport } from "../transport/types";
import { mapProductDetailDto, mapProductSummaryDto, type CatalogPageDto, type MobileProductListDto } from "../mappers/commerce-mapper";

export class RestProductRepository implements ProductRepository {
  constructor(private readonly transport: CommerceTransport) {}

  async loadProduct(productId: ProductId): Promise<Result<ProductDetail>> {
    try {
      const raw = await this.transport.request<Record<string, unknown>>({
        path: `/api/products/${encodeURIComponent(productId)}`,
      });
      return ok(mapProductDetailDto(raw));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async loadRelated(productId: ProductId): Promise<Result<ReadonlyArray<ProductSummary>>> {
    try {
      const dto = await this.transport.request<CatalogPageDto>({
        path: `/api/mobile/catalog/products?sellerId=&sort=popular`,
      });
      const filtered = dto.items.filter((item) => item.id !== productId).slice(0, 8);
      return ok(filtered.map((item) => mapProductSummaryDto(item)));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async recordRecentView(_productId: ProductId): Promise<Result<void>> {
    return ok(undefined);
  }

  async getRecentViews(): Promise<Result<ReadonlyArray<ProductSummary>>> {
    return ok([]);
  }
}
