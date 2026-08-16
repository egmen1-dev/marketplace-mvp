import { useLocalSearchParams } from "expo-router";

import { CatalogDiscoveryExperience } from "../../src/features/catalog-discovery/CatalogDiscoveryExperience";
import { useCatalogDiscovery } from "../../src/features/catalog-discovery/useCatalogDiscovery";

export default function CatalogScreen() {
  const params = useLocalSearchParams<{ q?: string; categoryId?: string }>();
  const initialQuery = typeof params.q === "string" ? params.q : "";
  const initialCategoryId = typeof params.categoryId === "string" ? params.categoryId : null;
  const state = useCatalogDiscovery(initialQuery, initialCategoryId);

  return <CatalogDiscoveryExperience state={state} />;
}
