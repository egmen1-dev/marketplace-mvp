export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_SUGGEST_MIN_LENGTH = 2;
export const SEARCH_HISTORY_LIMIT = 8;

export type SearchSuggestion = {
  type: string;
  id: string;
  title: string;
  slug: string;
};

export function normalizeSearchQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function shouldRequestSuggestions(value: string): boolean {
  return normalizeSearchQuery(value).length >= SEARCH_SUGGEST_MIN_LENGTH;
}

export function updateSearchHistory(
  previous: string[],
  value: string,
  limit = SEARCH_HISTORY_LIMIT,
): string[] {
  const normalized = normalizeSearchQuery(value);
  if (!normalized) return previous.slice(0, limit);
  const key = normalized.toLocaleLowerCase();
  return [
    normalized,
    ...previous
      .map(normalizeSearchQuery)
      .filter(Boolean)
      .filter((item) => item.toLocaleLowerCase() !== key),
  ].slice(0, limit);
}

export function createSuggestRequestGeneration() {
  let generation = 0;
  return {
    next: () => ++generation,
    invalidate: () => ++generation,
    isCurrent: (requestGeneration: number) => requestGeneration === generation,
  };
}
