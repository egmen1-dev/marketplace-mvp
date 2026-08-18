import type { SellerRepository } from "../../domain/contracts/repositories/index";
import type {
  SellerHomeDashboard,
  SellerOrderPage,
  SellerProductDetail,
  SellerProductFilter,
  SellerProductPage,
  SellerProductSort,
  SellerProductsSummary,
  SellerPublicProfile,
} from "../../domain/contracts/entities/seller";
import type { OrderId, ProductId, SellerId } from "../../domain/contracts/value-objects/ids";
import type { Result } from "../../domain/contracts/result";
import { err, ok } from "../../domain/contracts/result";
import { mapApiErrorToDomain } from "../network/map-api-error";
import type { CommerceTransport } from "../transport/types";
import {
  mapSellerHomeDto,
  mapSellerOrderDetailDto,
  mapSellerOrderPageDto,
  mapSellerOrdersSummaryDto,
  mapSellerProductDto,
  mapSellerProductPageDto,
  mapSellerPublicProfileDto,
  type SellerHomeDto,
  type SellerOrderDetailDto,
  type SellerOrderDto,
  type SellerOrdersSummaryDto,
  type SellerPublicProfileDto,
} from "../mappers/seller-mapper";
import type { MobileProductListDto } from "../mappers/commerce-mapper";

export class RestSellerRepository implements SellerRepository {
  constructor(private readonly transport: CommerceTransport) {}

  async loadSellerHome(): Promise<Result<SellerHomeDashboard>> {
    try {
      const dto = await this.transport.request<SellerHomeDto>({ path: "/api/mobile/seller/home" });
      return ok(mapSellerHomeDto(dto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async loadSellerProducts(params: {
    cursor?: string | null;
    query?: string | null;
    filter?: SellerProductFilter;
    sort?: SellerProductSort;
  }): Promise<Result<SellerProductPage>> {
    try {
      const search = new URLSearchParams();
      if (params.cursor) search.set("cursor", params.cursor);
      if (params.query?.trim()) search.set("q", params.query.trim());
      if (params.filter && params.filter !== "all") search.set("filter", params.filter);
      if (params.sort) search.set("sort", params.sort);
      const qs = search.toString();
      const dto = await this.transport.request<{
        items: MobileProductListDto[];
        nextCursor: string | null;
        total?: number;
      }>({
        path: `/api/mobile/seller/products${qs ? `?${qs}` : ""}`,
      });
      return ok(mapSellerProductPageDto(dto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async loadSellerProductsSummary(): Promise<Result<SellerProductsSummary>> {
    try {
      const dto = await this.transport.request<SellerProductsSummary>({
        path: "/api/mobile/seller/products/summary",
      });
      return ok(dto);
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async loadSellerProductDetail(productId: ProductId): Promise<Result<SellerProductDetail>> {
    try {
      const dto = await this.transport.request<
        MobileProductListDto & {
          description?: string | null;
          categoryName?: string | null;
          images?: Array<{ url: string; isPrimary: boolean }>;
        }
      >({
        path: `/api/mobile/seller/products/${encodeURIComponent(productId)}`,
      });
      const product = mapSellerProductDto(dto);
      return ok({
        ...product,
        description: dto.description ?? null,
        categoryName: dto.categoryName ?? dto.category?.name ?? null,
        images: dto.images?.map((img) => ({
          url: img.url,
          isPrimary: "isPrimary" in img ? Boolean(img.isPrimary) : false,
        })) ?? [],
      });
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async loadSellerOrders(params: {
    cursor?: string | null;
    query?: string | null;
    filter?: import("../../domain/contracts/entities/seller").SellerOrderFilter;
  }): Promise<Result<SellerOrderPage>> {
    try {
      const search = new URLSearchParams();
      if (params.cursor) search.set("cursor", params.cursor);
      if (params.query?.trim()) search.set("q", params.query.trim());
      if (params.filter && params.filter !== "all") search.set("filter", params.filter);
      const qs = search.toString();
      const dto = await this.transport.request<{
        items: SellerOrderDto[];
        nextCursor: string | null;
        total?: number;
      }>({
        path: `/api/mobile/seller/orders${qs ? `?${qs}` : ""}`,
      });
      return ok(mapSellerOrderPageDto(dto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async loadSellerOrdersSummary(): Promise<Result<import("../../domain/contracts/entities/seller").SellerOrdersSummary>> {
    try {
      const dto = await this.transport.request<SellerOrdersSummaryDto>({
        path: "/api/mobile/seller/orders/summary",
      });
      return ok(mapSellerOrdersSummaryDto(dto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async loadSellerOrderDetail(orderId: OrderId): Promise<Result<import("../../domain/contracts/entities/seller").SellerOrderDetail>> {
    try {
      const dto = await this.transport.request<SellerOrderDetailDto>({
        path: `/api/mobile/seller/orders/${encodeURIComponent(orderId)}`,
      });
      return ok(mapSellerOrderDetailDto(dto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async loadPublicProfile(sellerId: SellerId): Promise<Result<SellerPublicProfile>> {
    try {
      const dto = await this.transport.request<SellerPublicProfileDto>({
        path: `/api/mobile/seller/public/${encodeURIComponent(sellerId)}`,
      });
      return ok(mapSellerPublicProfileDto(dto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async executeAction(input: {
    action: import("../../domain/contracts/entities/seller").SellerActionKind;
    payload: Readonly<Record<string, string | number | boolean | null>>;
  }): Promise<Result<import("../../domain/contracts/entities/seller").SellerActionResult>> {
    try {
      const dto = await this.transport.request<{
        ok: boolean;
        action: string;
        message: string;
        errorCode?: string;
        openUrl?: string | null;
        undo?: { action: string; payload: Record<string, string | number | boolean | null> } | null;
      }>({
        path: "/api/mobile/seller/actions",
        method: "POST",
        body: input,
      });
      return ok({
        ok: dto.ok,
        action: dto.action as import("../../domain/contracts/entities/seller").SellerActionKind,
        message: dto.message,
        errorCode: dto.errorCode,
        openUrl: dto.openUrl ?? null,
        undo: dto.undo
          ? {
              action: dto.undo.action as import("../../domain/contracts/entities/seller").SellerActionKind,
              payload: dto.undo.payload,
            }
          : null,
      });
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }
}
