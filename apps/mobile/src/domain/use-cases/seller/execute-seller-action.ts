import type { SellerActionInput, SellerActionResult } from "../../contracts/entities/seller";
import type { DomainError } from "../../contracts/errors";
import type { SellerRepository } from "../../contracts/repositories/index";
import type { DomainEventBus } from "../../contracts/events";
import type { Result } from "../../contracts/result";
import type { CommandUseCase } from "../../contracts/use-cases/index";
import { extractOrderIdFromActionPayload, extractProductIdFromActionPayload } from "./seller-use-cases";

const ORDER_ACTIONS = new Set([
  "confirm_order",
  "ship_order",
  "ready_for_shipment",
  "ready_for_pickup",
  "mark_picked_up",
  "cancel_order",
]);

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

      const orderIdValue = extractOrderIdFromActionPayload(input.payload);
      if (orderIdValue && ORDER_ACTIONS.has(input.action)) {
        this.events.publish({
          type: "SellerOrderChanged",
          order: {
            id: orderIdValue,
            orderNumber: String(input.payload.orderNumber ?? orderIdValue),
            status: String(input.payload.nextStatus ?? "updated"),
            fulfillmentType: "DELIVERY",
            isOverdue: false,
            total: { amount: 0, currency: "RUB" },
            sellerSubtotal: { amount: 0, currency: "RUB" },
            buyerLabel: null,
            createdAt: new Date().toISOString(),
            itemCount: 0,
            previewTitle: null,
          },
          change: input.action === "cancel_order" ? "status_changed" : "updated",
        });
      }
    }
    return result;
  }
}
