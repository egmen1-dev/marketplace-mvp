import type { CartRepository } from "../../domain/contracts/repositories/index";
import type { Cart } from "../../domain/contracts/entities/cart";
import type { ProductId } from "../../domain/contracts/value-objects/ids";
import type { Result } from "../../domain/contracts/result";
import { err, ok } from "../../domain/contracts/result";
import { mapApiErrorToDomain } from "../network/map-api-error";
import type { CommerceTransport } from "../transport/types";
import { mapCartDto, type CartApiDto } from "../mappers/commerce-mapper";

export class RestCartRepository implements CartRepository {
  constructor(private readonly transport: CommerceTransport) {}

  async loadCart(): Promise<Result<Cart>> {
    try {
      const dto = await this.transport.request<CartApiDto>({ path: "/api/cart" });
      return ok(mapCartDto(dto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async addItem(productId: ProductId, quantity: number): Promise<Result<Cart>> {
    try {
      const dto = await this.transport.request<CartApiDto>({
        path: "/api/cart",
        method: "POST",
        body: { productId, quantity },
      });
      return ok(mapCartDto(dto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async updateQuantity(productId: ProductId, quantity: number): Promise<Result<Cart>> {
    try {
      const dto = await this.transport.request<CartApiDto>({
        path: "/api/cart",
        method: "PATCH",
        body: { productId, quantity },
      });
      return ok(mapCartDto(dto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async removeItem(productId: ProductId): Promise<Result<Cart>> {
    try {
      const dto = await this.transport.request<CartApiDto>({
        path: `/api/cart?productId=${encodeURIComponent(productId)}`,
        method: "DELETE",
      });
      return ok(mapCartDto(dto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }
}
