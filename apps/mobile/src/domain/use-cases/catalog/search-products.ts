import type { SearchSuggestion } from "../../contracts/entities/catalog";
import type { DomainError } from "../../contracts/errors";
import type { SearchRepository } from "../../contracts/repositories/index";
import type { Result } from "../../contracts/result";
import type { QueryUseCase } from "../../contracts/use-cases/index";

export class SearchProducts implements QueryUseCase<{ query: string }, ReadonlyArray<SearchSuggestion>> {
  constructor(private readonly searchRepository: SearchRepository) {}

  execute(input: { query: string }): Promise<Result<ReadonlyArray<SearchSuggestion>, DomainError>> {
    return this.searchRepository.suggest(input.query);
  }
}
