import type { SellerRepository } from "../../domain/contracts/repositories/index";
import type {
  SellerHomeDashboard,
  SellerOrderPage,
  SellerProductPage,
  SellerPublicProfile,
} from "../../domain/contracts/entities/seller";
import type { SellerId } from "../../domain/contracts/value-objects/ids";
import type { Result } from "../../domain/contracts/result";
import { err, ok } from "../../domain/contracts/result";
import { mapApiErrorToDomain } from "../network/map-api-error";
import type { CommerceTransport } from "../transport/types";
import {
  mapSellerHomeDto,
  mapSellerOrderPageDto,
  mapSellerProductPageDto,
  mapSellerPublicProfileDto,
  type SellerHomeDto,
  type SellerOrderDto,
  type SellerPublicProfileDto,
} from "../mappers/seller-mapper";
import type { CatalogPageDto } from "../mappers/commerce-mapper";

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

  async loadSellerProducts(params: { cursor?: string | null; query?: string }): Promise<Result<SellerProductPage>> {
    try {
      const search = new URLSearchParams();
      if (params.cursor) search.set("cursor", params.cursor);
      const qs = search.toString();
      const dto = await this.transport.request<CatalogPageDto>({
        path: `/api/mobile/seller/products${qs ? `?${qs}` : ""}`,
      });
      return ok(mapSellerProductPageDto(dto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async loadSellerOrders(params: { cursor?: string | null }): Promise<Result<SellerOrderPage>> {
    try {
      const search = new URLSearchParams();
      if (params.cursor) search.set("cursor", params.cursor);
      const qs = search.toString();
      const dto = await this.transport.request<{ items: SellerOrderDto[]; nextCursor: string | null }>({
        path: `/api/mobile/seller/orders${qs ? `?${qs}` : ""}`,
      });
      return ok(mapSellerOrderPageDto(dto));
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
