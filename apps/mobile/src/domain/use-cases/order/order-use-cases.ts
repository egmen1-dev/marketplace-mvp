import type { OrderDetail, OrderSummary, SharePayload } from "../../contracts/entities/order";
import type { OrderId } from "../../contracts/value-objects/ids";
import type { Cart } from "../../contracts/entities/cart";
import type { DomainError } from "../../contracts/errors";
import type { OrderRepository, CartRepository } from "../../contracts/repositories/index";
import type { DomainEventBus } from "../../contracts/events";
import type { Result } from "../../contracts/result";
import type { QueryUseCase, CommandUseCase } from "../../contracts/use-cases/index";

export class LoadOrders implements QueryUseCase<Record<string, never>, ReadonlyArray<OrderSummary>> {
  constructor(private readonly orderRepository: OrderRepository) {}

  execute(_input: Record<string, never>): Promise<Result<ReadonlyArray<OrderSummary>, DomainError>> {
    return this.orderRepository.loadOrders();
  }
}

export class LoadOrderDetail implements QueryUseCase<{ orderId: OrderId }, OrderDetail> {
  constructor(private readonly orderRepository: OrderRepository) {}

  execute(input: { orderId: OrderId }): Promise<Result<OrderDetail, DomainError>> {
    return this.orderRepository.loadOrderDetail(input.orderId);
  }
}

export class ShareOrder implements QueryUseCase<{ orderId: OrderId }, SharePayload> {
  constructor(private readonly orderRepository: OrderRepository) {}

  execute(input: { orderId: OrderId }): Promise<Result<SharePayload, DomainError>> {
    return this.orderRepository.buildSharePayload(input.orderId);
  }
}

export type ReorderItemsInput = { items: ReadonlyArray<{ productId: import("../../contracts/value-objects/ids").ProductId; quantity: number }> };

export class ReorderItems implements CommandUseCase<ReorderItemsInput, Cart> {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly events: DomainEventBus,
  ) {}

  async execute(input: ReorderItemsInput): Promise<Result<Cart, DomainError>> {
    let lastResult: Result<Cart, DomainError> | null = null;
    for (const item of input.items) {
      lastResult = await this.cartRepository.addItem(item.productId, item.quantity);
      if (!lastResult.ok) return lastResult;
    }
    if (!lastResult?.ok) {
      return this.cartRepository.loadCart();
    }
    this.events.publish({ type: "CartUpdated", cart: lastResult.value });
    return lastResult;
  }
}
