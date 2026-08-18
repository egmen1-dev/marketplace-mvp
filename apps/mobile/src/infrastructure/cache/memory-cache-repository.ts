import type { Result } from "../../domain/contracts/result";
import { err, ok } from "../../domain/contracts/result";
import type { CacheRepository } from "../../domain/contracts/repositories/index";

type CacheEntry = { value: unknown; expiresAt: number };

export class MemoryCacheRepository implements CacheRepository {
  private readonly store = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<Result<T | null>> {
    const entry = this.store.get(key);
    if (!entry) return ok(null);
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return ok(null);
    }
    return ok(entry.value as T);
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<Result<void>> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return ok(undefined);
  }

  async invalidate(keyOrPattern: string): Promise<Result<void>> {
    if (keyOrPattern.includes("*")) {
      const prefix = keyOrPattern.replace("*", "");
      for (const key of this.store.keys()) {
        if (key.startsWith(prefix)) this.store.delete(key);
      }
    } else {
      this.store.delete(keyOrPattern);
    }
    return ok(undefined);
  }

  async clear(): Promise<Result<void>> {
    this.store.clear();
    return ok(undefined);
  }
}
