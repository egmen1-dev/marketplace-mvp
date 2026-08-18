import type { SellerActionInput, SellerActionResult } from "../../contracts/entities/seller";
import type { DomainError } from "../../contracts/errors";
import type { SellerRepository } from "../../contracts/repositories/index";
import type { Result } from "../../contracts/result";
import type { CommandUseCase } from "../../contracts/use-cases/index";

export class ExecuteSellerAction implements CommandUseCase<SellerActionInput, SellerActionResult> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(input: SellerActionInput): Promise<Result<SellerActionResult, DomainError>> {
    return this.sellerRepository.executeAction(input);
  }
}
