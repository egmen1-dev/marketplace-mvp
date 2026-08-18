import type { SearchRepository } from "../../domain/contracts/repositories/index";
import type { SearchSuggestion } from "../../domain/contracts/entities/catalog";
import type { Result } from "../../domain/contracts/result";
import { err, ok } from "../../domain/contracts/result";
import { mapApiErrorToDomain } from "../network/map-api-error";
import type { CommerceTransport } from "../transport/types";

export class RestSearchRepository implements SearchRepository {
  constructor(private readonly transport: CommerceTransport) {}

  async suggest(query: string): Promise<Result<ReadonlyArray<SearchSuggestion>>> {
    try {
      const dto = await this.transport.request<{
        items: Array<{ type: string; id: string; title: string; slug: string }>;
      }>({ path: `/api/products/suggest?q=${encodeURIComponent(query)}&limit=8` });
      return ok(
        dto.items.map((item) => ({
          text: item.title,
          source: "api" as const,
        })),
      );
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async getHistory(): Promise<Result<ReadonlyArray<string>>> {
    return ok([]);
  }

  async pushHistory(_query: string): Promise<Result<ReadonlyArray<string>>> {
    return ok([]);
  }

  async clearHistory(): Promise<Result<void>> {
    return ok(undefined);
  }
}
