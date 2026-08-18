import type { CheckoutRepository } from "../../domain/contracts/repositories/index";
import type { CheckoutForm, CheckoutResult, DeliveryQuote, DeliveryRequest, PickupPoint } from "../../domain/contracts/entities/checkout";
import type { Result } from "../../domain/contracts/result";
import { err, ok } from "../../domain/contracts/result";
import { loadAppConfig } from "../../config/env";
import { mapApiErrorToDomain } from "../network/map-api-error";
import type { CommerceTransport } from "../transport/types";
import { mapDeliveryQuoteDto, mapPickupPointDto } from "../mappers/checkout-mapper";

export class RestCheckoutRepository implements CheckoutRepository {
  constructor(private readonly transport: CommerceTransport) {}

  async quoteDelivery(request: DeliveryRequest): Promise<Result<DeliveryQuote>> {
    try {
      const dto = await this.transport.request<{
        quote: { cost: number; currency: string };
        etaLabel: string;
        source: string;
      }>({
        path: "/api/delivery/quote",
        method: "POST",
        body: {
          method: request.method,
          city: request.city,
          weightGrams: 500,
        },
      });
      return ok(mapDeliveryQuoteDto({ ...dto, method: request.method }));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async loadPickupPoints(city: string): Promise<Result<ReadonlyArray<PickupPoint>>> {
    try {
      const dto = await this.transport.request<{
        points: Array<{ code: string; name: string; address: string; city: string; workTime?: string }>;
      }>({ path: `/api/delivery/points?city=${encodeURIComponent(city)}` });
      return ok((dto.points ?? []).map(mapPickupPointDto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async createOrder(_form: CheckoutForm): Promise<Result<CheckoutResult>> {
    const config = loadAppConfig();
    return ok({ kind: "redirect", url: `${config.apiBaseUrl}/checkout` });
  }
}
