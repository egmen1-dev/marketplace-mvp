/**
 * Canonical create LOT validation contract — single source of truth for Preview vs Submit.
 */

import {
  validateLotCharacteristicForm,
  type LotCharacteristicDefinition,
  type LotCharacteristicFormValue,
} from "./lot-characteristics";

export type LotValidationStage = "preview" | "submit";

export type LotPreviewBlockerCode =
  | "TITLE_MISSING"
  | "PRICE_INVALID"
  | "STOCK_INVALID"
  | "CITY_MISSING"
  | "CATEGORY_MISSING"
  | "PRODUCT_TYPE_MISSING"
  | "PHOTOS_MISSING"
  | "PICKUP_POINTS_MISSING"
  | "CHARACTERISTIC_MISSING"
  | "UPLOAD_PENDING"
  | "UPLOAD_FAILED";

export type LotPreviewBlocker = {
  code: LotPreviewBlockerCode;
  message: string;
  field?: "title" | "price" | "stock" | "city" | "category" | "productType" | "photos" | "pickup" | "characteristics";
};

export type LotPreviewValidationInput = {
  title: string;
  price: string;
  stock: string;
  city: string;
  categoryId: string | null;
  productTypeId: string | null;
  imagesCount: number;
  pickupEnabled: boolean;
  pickupPointIds: string[];
  characteristicDefinitions: LotCharacteristicDefinition[];
  characteristicValues: Record<string, LotCharacteristicFormValue>;
  imagesUploading?: boolean;
  hasFailedUploads?: boolean;
};

export type LotPreviewValidationResult = {
  canPreview: boolean;
  canSubmit: boolean;
  blockers: LotPreviewBlocker[];
  previewBlockers: LotPreviewBlocker[];
  submitBlockers: LotPreviewBlocker[];
  reasonCodes: LotPreviewBlockerCode[];
};

export function parseLotPriceNumber(price: string): number {
  const n = Number(price.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function parseLotStockNumber(stock: string): number {
  const raw = stock.replace(/\s/g, "").trim();
  if (!raw) return NaN;
  const n = Number(raw);
  if (!Number.isFinite(n)) return NaN;
  return Math.floor(n);
}

function baseBlockers(input: LotPreviewValidationInput): LotPreviewBlocker[] {
  const blockers: LotPreviewBlocker[] = [];
  const title = input.title.trim();
  const city = input.city.trim();
  const priceNumber = parseLotPriceNumber(input.price);
  const stockNumber = parseLotStockNumber(input.stock);

  if (title.length < 2) {
    blockers.push({ code: "TITLE_MISSING", message: "Укажите название", field: "title" });
  }
  if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
    blockers.push({ code: "PRICE_INVALID", message: "Укажите корректную цену", field: "price" });
  }
  if (!Number.isFinite(stockNumber) || stockNumber < 1) {
    blockers.push({ code: "STOCK_INVALID", message: "Количество должно быть не меньше 1", field: "stock" });
  }
  if (city.length < 2) {
    blockers.push({ code: "CITY_MISSING", message: "Укажите город", field: "city" });
  }
  if (!input.categoryId) {
    blockers.push({ code: "CATEGORY_MISSING", message: "Выберите категорию", field: "category" });
  }
  if (!input.productTypeId) {
    blockers.push({ code: "PRODUCT_TYPE_MISSING", message: "Выберите тип ЛОТа", field: "productType" });
  }
  if (input.imagesCount < 1) {
    blockers.push({ code: "PHOTOS_MISSING", message: "Добавьте хотя бы 1 фотографию", field: "photos" });
  }
  if (input.pickupEnabled && input.pickupPointIds.length === 0) {
    blockers.push({
      code: "PICKUP_POINTS_MISSING",
      message: "Выберите хотя бы одну точку самовывоза",
      field: "pickup",
    });
  }
  if (input.imagesUploading) {
    blockers.push({ code: "UPLOAD_PENDING", message: "Подождите, фото ещё загружается", field: "photos" });
  }
  if (input.hasFailedUploads) {
    blockers.push({ code: "UPLOAD_FAILED", message: "Не удалось загрузить фото — повторите загрузку", field: "photos" });
  }

  return blockers;
}

function characteristicBlockers(input: LotPreviewValidationInput): LotPreviewBlocker[] {
  const issues = validateLotCharacteristicForm(
    input.characteristicDefinitions,
    input.characteristicValues,
    { onlyRequired: true },
  );
  return issues.map((issue) => ({
    code: "CHARACTERISTIC_MISSING" as const,
    message: issue.message,
    field: "characteristics" as const,
  }));
}

export function evaluateLotPreviewValidation(input: LotPreviewValidationInput): LotPreviewValidationResult {
  const previewBlockers = baseBlockers(input);
  const submitOnlyBlockers = characteristicBlockers(input);
  const submitBlockers = [...previewBlockers, ...submitOnlyBlockers];

  return {
    canPreview: previewBlockers.length === 0,
    canSubmit: submitBlockers.length === 0,
    blockers: previewBlockers,
    previewBlockers,
    submitBlockers,
    reasonCodes: previewBlockers.map((b) => b.code),
  };
}

export function formatPreviewBlockersMessage(blockers: LotPreviewBlocker[]): string | null {
  if (blockers.length === 0) return null;
  if (blockers.length === 1) return blockers[0]!.message;
  return `Чтобы продолжить, заполните: ${blockers.map((b) => b.message.toLowerCase()).join(", ")}`;
}

export function firstPreviewBlockerField(blockers: LotPreviewBlocker[]): LotPreviewBlocker["field"] | null {
  return blockers.find((b) => b.field)?.field ?? null;
}
