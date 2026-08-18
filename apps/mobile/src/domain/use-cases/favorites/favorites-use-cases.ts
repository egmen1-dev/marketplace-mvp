import type { FavoriteToggleResult, FavoritesSnapshot } from "../../contracts/entities/cart";
import type { ProductId } from "../../contracts/value-objects/ids";
import type { DomainError } from "../../contracts/errors";
import type { FavoritesRepository } from "../../contracts/repositories/index";
import type { DomainEventBus } from "../../contracts/events";
import type { Result } from "../../contracts/result";
import type { CommandUseCase, QueryUseCase } from "../../contracts/use-cases/index";

export class LoadFavorites implements QueryUseCase<Record<string, never>, FavoritesSnapshot> {
  constructor(private readonly favoritesRepository: FavoritesRepository) {}

  execute(_input: Record<string, never>): Promise<Result<FavoritesSnapshot, DomainError>> {
    return this.favoritesRepository.loadFavorites();
  }
}

export class ToggleFavorite implements CommandUseCase<{ productId: ProductId }, FavoriteToggleResult> {
  constructor(
    private readonly favoritesRepository: FavoritesRepository,
    private readonly events: DomainEventBus,
  ) {}

  async execute(input: { productId: ProductId }): Promise<Result<FavoriteToggleResult, DomainError>> {
    const result = await this.favoritesRepository.toggleFavorite(input.productId);
    if (result.ok) {
      this.events.publish({
        type: "FavoriteChanged",
        productId: input.productId,
        isFavorite: result.value.isFavorite,
        favoritesCount: result.value.favoritesCount,
      });
    }
    return result;
  }
}
