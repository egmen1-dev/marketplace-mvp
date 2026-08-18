import type { OrderRepository } from "../../domain/contracts/repositories/index";
import type { OrderDetail, OrderSummary, SharePayload } from "../../domain/contracts/entities/order";
import type { OrderId } from "../../domain/contracts/value-objects/ids";
import type { Result } from "../../domain/contracts/result";
import { err, ok } from "../../domain/contracts/result";
import { mapApiErrorToDomain } from "../network/map-api-error";
import type { CommerceTransport } from "../transport/types";
import { mapOrderDetailDto, mapOrderSummaryDto, mapSharePayload } from "../mappers/order-mapper";

export class RestOrderRepository implements OrderRepository {
  constructor(private readonly transport: CommerceTransport) {}

  async loadOrders(): Promise<Result<ReadonlyArray<OrderSummary>>> {
    try {
      const dto = await this.transport.request<{ items: Record<string, unknown>[] }>({ path: "/api/orders" });
      return ok(dto.items.map(mapOrderSummaryDto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async loadOrderDetail(orderId: OrderId): Promise<Result<OrderDetail>> {
    try {
      const raw = await this.transport.request<Record<string, unknown>>({
        path: `/api/orders/${encodeURIComponent(orderId)}`,
      });
      return ok(mapOrderDetailDto(raw));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async buildSharePayload(orderId: OrderId): Promise<Result<SharePayload>> {
    const detail = await this.loadOrderDetail(orderId);
    if (!detail.ok) return detail;
    return ok(mapSharePayload(detail.value.id, detail.value.orderNumber));
  }
}
