import type { Cart } from "../../contracts/entities/cart";
import type { DomainError } from "../../contracts/errors";
import type { CartRepository } from "../../contracts/repositories/index";
import type { DomainEventBus } from "../../contracts/events";
import type { Result } from "../../contracts/result";
import type { QueryUseCase } from "../../contracts/use-cases/index";

export class LoadCart implements QueryUseCase<Record<string, never>, Cart> {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly events: DomainEventBus,
  ) {}

  async execute(_input: Record<string, never>): Promise<Result<Cart, DomainError>> {
    const result = await this.cartRepository.loadCart();
    if (result.ok) {
      this.events.publish({ type: "CartUpdated", cart: result.value });
    }
    return result;
  }
}

export type AddToCartInput = { productId: import("../../contracts/value-objects/ids").ProductId; quantity: number };

export class AddToCart implements QueryUseCase<AddToCartInput, Cart> {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly events: DomainEventBus,
  ) {}

  async execute(input: AddToCartInput): Promise<Result<Cart, DomainError>> {
    const result = await this.cartRepository.addItem(input.productId, input.quantity);
    if (result.ok) {
      this.events.publish({ type: "CartUpdated", cart: result.value, changedProductId: input.productId });
    }
    return result;
  }
}

export type RemoveFromCartInput = { productId: import("../../contracts/value-objects/ids").ProductId };

export class RemoveFromCart implements QueryUseCase<RemoveFromCartInput, Cart> {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly events: DomainEventBus,
  ) {}

  async execute(input: RemoveFromCartInput): Promise<Result<Cart, DomainError>> {
    const result = await this.cartRepository.removeItem(input.productId);
    if (result.ok) {
      this.events.publish({ type: "CartUpdated", cart: result.value, changedProductId: input.productId });
    }
    return result;
  }
}

export type UpdateCartQuantityInput = {
  productId: import("../../contracts/value-objects/ids").ProductId;
  quantity: number;
};

export class UpdateCartQuantity implements QueryUseCase<UpdateCartQuantityInput, Cart> {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly events: DomainEventBus,
  ) {}

  async execute(input: UpdateCartQuantityInput): Promise<Result<Cart, DomainError>> {
    const result = await this.cartRepository.updateQuantity(input.productId, input.quantity);
    if (result.ok) {
      this.events.publish({ type: "CartUpdated", cart: result.value, changedProductId: input.productId });
    }
    return result;
  }
}
