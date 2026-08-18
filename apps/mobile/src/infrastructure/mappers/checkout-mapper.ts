import type { DeliveryQuote, PickupPoint } from "../../domain/contracts/entities/checkout";
import { money } from "../../domain/contracts/value-objects/money";

export function mapDeliveryQuoteDto(dto: {
  quote: { cost: number; currency: string };
  etaLabel: string;
  source: string;
  method?: "PICKUP" | "COURIER";
}): DeliveryQuote {
  return {
    price: money(dto.quote.cost, dto.quote.currency),
    etaLabel: dto.etaLabel,
    method: dto.method ?? "PICKUP",
  };
}

export function mapPickupPointDto(dto: {
  code: string;
  name: string;
  address: string;
  city: string;
  workTime?: string;
}): PickupPoint {
  return {
    code: dto.code,
    label: dto.name,
    address: [dto.address, dto.city].filter(Boolean).join(", "),
  };
}

export function deliveryQuoteToView(quote: DeliveryQuote) {
  return {
    cost: quote.price.amount,
    currency: quote.price.currency,
    etaLabel: quote.etaLabel ?? "",
    source: quote.method,
  };
}

export function pickupPointToView(point: PickupPoint & { workTime?: string }) {
  return {
    code: point.code,
    name: point.label,
    address: point.address,
    city: "",
    workTime: point.workTime,
  };
}
