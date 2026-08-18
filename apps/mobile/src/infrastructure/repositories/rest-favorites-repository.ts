import type { FavoritesRepository } from "../../domain/contracts/repositories/index";
import type { FavoriteToggleResult, FavoritesSnapshot } from "../../domain/contracts/entities/cart";
import type { ProductId } from "../../domain/contracts/value-objects/ids";
import type { Result } from "../../domain/contracts/result";
import { err, ok } from "../../domain/contracts/result";
import { mapApiErrorToDomain } from "../network/map-api-error";
import type { CommerceTransport } from "../transport/types";
import { mapProductSummaryDto, type MobileProductListDto } from "../mappers/commerce-mapper";

export class RestFavoritesRepository implements FavoritesRepository {
  constructor(private readonly transport: CommerceTransport) {}

  async loadFavorites(): Promise<Result<FavoritesSnapshot>> {
    try {
      const dto = await this.transport.request<{ items: MobileProductListDto[] }>({
        path: "/api/mobile/favorites",
      });
      return ok({
        items: dto.items.map((item) => mapProductSummaryDto(item, true)),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async toggleFavorite(productId: ProductId): Promise<Result<FavoriteToggleResult>> {
    try {
      const dto = await this.transport.request<{ isFavorite: boolean; favoritesCount?: number }>({
        path: "/api/mobile/favorites",
        method: "POST",
        body: { productId },
      });
      return ok({
        productId,
        isFavorite: dto.isFavorite,
        favoritesCount: dto.favoritesCount,
      });
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async isFavorite(productId: ProductId): Promise<Result<boolean>> {
    const snapshot = await this.loadFavorites();
    if (!snapshot.ok) return snapshot;
    return ok(snapshot.value.items.some((item) => item.id === productId));
  }
}
