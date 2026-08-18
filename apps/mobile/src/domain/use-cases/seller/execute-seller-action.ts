import type { SellerActionInput, SellerActionResult } from "../../contracts/entities/seller";
import type { DomainError } from "../../contracts/errors";
import type { SellerRepository } from "../../contracts/repositories/index";
import type { DomainEventBus } from "../../contracts/events";
import type { Result } from "../../contracts/result";
import type { CommandUseCase } from "../../contracts/use-cases/index";
import { extractProductIdFromActionPayload } from "./seller-use-cases";

export class ExecuteSellerAction implements CommandUseCase<SellerActionInput, SellerActionResult> {
  constructor(
    private readonly sellerRepository: SellerRepository,
    private readonly events: DomainEventBus,
  ) {}

  async execute(input: SellerActionInput): Promise<Result<SellerActionResult, DomainError>> {
    const result = await this.sellerRepository.executeAction(input);
    if (result.ok && result.value.ok) {
      const productIdValue = extractProductIdFromActionPayload(input.payload);
      if (productIdValue) {
        const change =
          input.action === "delete_product"
            ? "deleted"
            : input.action === "publish_product" ||
                input.action === "hide_product" ||
                input.action === "move_to_draft"
              ? "status_changed"
              : "updated";
        this.events.publish({
          type: "SellerProductChanged",
          productId: productIdValue,
          change,
        });
      }
    }
    return result;
  }
}
