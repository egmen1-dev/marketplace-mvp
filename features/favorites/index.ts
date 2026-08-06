/** Favorites — DB-backed hearts for authenticated buyers. */

export {
  listFavoriteIds,
  listFavoriteProducts,
  toggleFavorite,
  isFavorite,
  FavoriteServiceError,
  type ToggleFavoriteResult,
} from "./queries";
export {
  toggleFavoriteAction,
  getFavoriteIdsAction,
  listFavoritesAction,
  type FavoriteToggleActionResult,
} from "./actions";
export {
  FavoritesProvider,
  useFavorites,
  useFavorite,
  FavoritesGrid,
} from "./components";
