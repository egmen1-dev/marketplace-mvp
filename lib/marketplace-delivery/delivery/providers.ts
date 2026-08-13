import type {
  DeliveryCostInput,
  DeliveryCostResult,
  DeliveryTrackingSnapshot,
  MarketplaceDeliveryProviderName,
  ShipmentCreateInput,
  ShipmentCreateResult,
} from "./types";

export interface MarketplaceDeliveryProvider {
  readonly name: MarketplaceDeliveryProviderName;

  createShipment(input: ShipmentCreateInput): Promise<ShipmentCreateResult>;

  calculateCost(input: DeliveryCostInput): Promise<DeliveryCostResult>;

  getTracking(trackingNumber: string): Promise<DeliveryTrackingSnapshot | null>;

  cancelShipment(externalId: string): Promise<void>;
}
