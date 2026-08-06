/**
 * @deprecated Prefer `@/features/favorites/components/favorites-provider`.
 * Thin re-export to avoid breaking stray imports without circular barrels.
 */
export {
  useFavorite,
  useFavorites,
} from "@/features/favorites/components/favorites-provider";

/** Legacy helper — guests no longer persist local favorites (auth required). */
export function useFavoriteIds(): string[] {
  return [];
}
