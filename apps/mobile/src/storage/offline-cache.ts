const cache = new Map<string, { savedAt: string; payload: unknown }>();

export function saveSnapshot(key: string, payload: unknown): void {
  cache.set(key, { savedAt: new Date().toISOString(), payload });
}

export function readSnapshot<T>(key: string): { savedAt: string; payload: T } | null {
  const row = cache.get(key);
  if (!row) return null;
  return row as { savedAt: string; payload: T };
}

export function clearSnapshots(): void {
  cache.clear();
}
