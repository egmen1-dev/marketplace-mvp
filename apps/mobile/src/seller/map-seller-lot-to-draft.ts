import type { SellerLotDetail } from "../api/seller-lot";
import {
  mapSellerLotToEditDraft,
  resolveEditPersistStatus,
  resolveEditPublishAllowed,
  type SellerLotEditSource,
} from "../../../../lib/mobile/seller-lot-edit-map";
import { EMPTY_LOT_DRAFT, type LotDraft } from "./lot-draft-storage";

export {
  mapCharacteristicFormValues,
  mapSellerLotImages,
  resolveEditPublishAllowed,
  resolveEditPersistStatus,
} from "../../../../lib/mobile/seller-lot-edit-map";

export function mapSellerLotToDraft(lot: SellerLotDetail): LotDraft {
  const mapped = mapSellerLotToEditDraft(lot as SellerLotEditSource);
  return {
    ...EMPTY_LOT_DRAFT,
    ...mapped,
    images: mapped.images,
    step: "photos",
    updatedAt: new Date().toISOString(),
  };
}
