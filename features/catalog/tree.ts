/**
 * Pure category-tree helpers (no DB) — used by queries + Vitest.
 */

export type CategoryTreeNodeInput = {
  id: string;
  parentId: string | null;
  isActive?: boolean;
};

export type CategoryPathNode = {
  id: string;
  name: string;
  parentId: string | null;
  level?: number;
};

export type CategoryIdCount = {
  id: string;
  count: number;
};

/** Level from parent chain: root=1, child=parent+1 (capped conceptually at 3). */
export function computeCategoryLevel(
  nodes: Array<{ id: string; parentId: string | null }>,
  categoryId: string,
): number {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let level = 1;
  let current = byId.get(categoryId);
  while (current?.parentId) {
    level += 1;
    current = byId.get(current.parentId);
    if (level > 32) break;
  }
  return level;
}

/** Full path names root → … → self. */
export function buildCategoryPath(
  nodes: CategoryPathNode[],
  categoryId: string,
): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parts: string[] = [];
  let current = byId.get(categoryId);
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return parts;
}

export function buildCategoryPathLabel(
  nodes: CategoryPathNode[],
  categoryId: string,
  separator = " / ",
): string {
  return buildCategoryPath(nodes, categoryId).join(separator);
}

export type CategorySearchHit = {
  id: string;
  name: string;
  pathLabel: string;
  level: number;
  isLeaf: boolean;
};

/** Case-insensitive name match; handles RU inflection prefixes (тепловая → тепловые). */
export function categoryNameMatches(name: string, query: string): boolean {
  const n = name.toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (n.includes(q)) return true;

  const stemLen = Math.min(q.length, Math.max(4, q.length - 2));
  const stem = q.slice(0, stemLen);
  if (stem.length < 3) return false;

  return n
    .split(/[\s,/()-]+/)
    .filter(Boolean)
    .some((token) => token.startsWith(stem) || stem.startsWith(token.slice(0, stem.length)));
}

/** Search categories by name; prefer leaves, then deeper levels. */
export function searchCategories(
  nodes: CategoryPathNode[],
  query: string,
  options?: { limit?: number },
): CategorySearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const limit = options?.limit ?? 12;
  const childIds = new Set(
    nodes.map((n) => n.parentId).filter((id): id is string => Boolean(id)),
  );

  const hits: CategorySearchHit[] = [];
  for (const node of nodes) {
    if (!categoryNameMatches(node.name, q)) continue;
    const level = node.level ?? computeCategoryLevel(nodes, node.id);
    hits.push({
      id: node.id,
      name: node.name,
      pathLabel: buildCategoryPathLabel(nodes, node.id),
      level,
      isLeaf: !childIds.has(node.id),
    });
  }

  hits.sort((a, b) => {
    if (a.isLeaf !== b.isLeaf) return a.isLeaf ? -1 : 1;
    if (b.level !== a.level) return b.level - a.level;
    return a.name.localeCompare(b.name, "ru");
  });

  return hits.slice(0, limit);
}

/** BFS: root id + all descendant ids (optionally skipping inactive). */
export function collectDescendantIds(
  nodes: CategoryTreeNodeInput[],
  rootId: string,
  options?: { activeOnly?: boolean },
): string[] {
  const activeOnly = options?.activeOnly ?? true;
  const byParent = new Map<string | null, CategoryTreeNodeInput[]>();

  for (const node of nodes) {
    if (activeOnly && node.isActive === false) continue;
    const list = byParent.get(node.parentId) ?? [];
    list.push(node);
    byParent.set(node.parentId, list);
  }

  const root = nodes.find((n) => n.id === rootId);
  if (!root) return [];
  if (activeOnly && root.isActive === false) return [];

  const ids: string[] = [rootId];
  const queue = [rootId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = byParent.get(current) ?? [];
    for (const child of children) {
      ids.push(child.id);
      queue.push(child.id);
    }
  }

  return ids;
}

/** Product count for a category including all descendants. */
export function productCountWithDescendants(
  nodes: CategoryTreeNodeInput[],
  rootId: string,
  directCounts: CategoryIdCount[],
  options?: { activeOnly?: boolean },
): number {
  const ids = new Set(
    collectDescendantIds(nodes, rootId, options),
  );
  const byId = new Map(directCounts.map((c) => [c.id, c.count]));
  let total = 0;
  for (const id of ids) {
    total += byId.get(id) ?? 0;
  }
  return total;
}

/** Build adjacency map parentId → child ids. */
export function childrenByParentId(
  nodes: CategoryTreeNodeInput[],
  options?: { activeOnly?: boolean },
): Map<string | null, string[]> {
  const activeOnly = options?.activeOnly ?? true;
  const map = new Map<string | null, string[]>();
  for (const node of nodes) {
    if (activeOnly && node.isActive === false) continue;
    const list = map.get(node.parentId) ?? [];
    list.push(node.id);
    map.set(node.parentId, list);
  }
  return map;
}

/** Ancestor chain from root → parent of `categoryId` (excluding self). */
export function collectAncestorIds(
  nodes: Array<{ id: string; parentId: string | null }>,
  categoryId: string,
): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ancestors: string[] = [];
  let current = byId.get(categoryId);
  while (current?.parentId) {
    ancestors.unshift(current.parentId);
    current = byId.get(current.parentId);
  }
  return ancestors;
}
