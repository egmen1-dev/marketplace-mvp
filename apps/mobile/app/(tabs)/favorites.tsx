import { FavoritesExperience } from "../../src/features/favorites/FavoritesExperience";
import { useFavoritesData } from "../../src/features/favorites/useFavoritesData";

export default function FavoritesScreen() {
  const state = useFavoritesData();
  return <FavoritesExperience state={state} />;
}
