export type HomeCategoryRef = { id: string; name: string; slug?: string };

export type HomeCategoryShortcutId = "electronics" | "home" | "transport" | "clothing";

export function resolveHomeCategoryId(
  shortcutId: HomeCategoryShortcutId,
  categories: HomeCategoryRef[],
): string | null {
  const bySlug = new Map(categories.map((category) => [category.slug ?? category.id, category.id]));
  const byName = new Map(categories.map((category) => [category.name.toLowerCase(), category.id]));

  if (shortcutId === "electronics") {
    return bySlug.get("electronics") ?? byName.get("электроника") ?? null;
  }
  if (shortcutId === "home") {
    return bySlug.get("home") ?? byName.get("дом и сад") ?? byName.get("дом") ?? null;
  }
  if (shortcutId === "clothing") {
    return bySlug.get("clothing") ?? byName.get("одежда") ?? null;
  }
  if (shortcutId === "transport") {
    return bySlug.get("auto") ?? bySlug.get("transport") ?? byName.get("транспорт") ?? null;
  }
  return null;
}

export function buildHomeCategoryCatalogRoute(
  shortcutId: HomeCategoryShortcutId,
  categories: HomeCategoryRef[],
): { pathname: "/(tabs)/catalog"; params: { categoryId: string; q: string; deals: string } } | { pathname: "/(tabs)/catalog" } {
  const categoryId = resolveHomeCategoryId(shortcutId, categories);
  if (!categoryId) {
    return { pathname: "/(tabs)/catalog" };
  }
  return {
    pathname: "/(tabs)/catalog",
    params: { categoryId, q: "", deals: "0" },
  };
}
