import { discountPercent } from "../../utils/format";
import type { MobileProductListItem } from "../../api/endpoints";

export type ProductImage = { url: string; alt?: string | null };
export type ProductCharacteristic = { name: string; displayValue: string };
export type ProductPickupPoint = {
  id: string;
  name: string;
  city: string;
  address: string;
  description?: string | null;
  workingHours?: string | null;
  isActive?: boolean;
};

export type ProductSeller = {
  id: string;
  storeName: string;
  slug?: string;
  isVerified: boolean;
  productCount?: number | null;
};

export type ProductDetailView = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  compareAt: number | null;
  discount: number | null;
  stock: number;
  views: number;
  favoritesCount: number;
  city: string | null;
  condition: string | null;
  conditionLabel: string | null;
  brandName: string | null;
  pickupEnabled: boolean;
  images: ProductImage[];
  characteristics: ProductCharacteristic[];
  pickupPoints: ProductPickupPoint[];
  seller: ProductSeller | null;
  categoryId: string | null;
  categoryName: string | null;
  highlights: string[];
  trustItems: string[];
};

const CONDITION_LABELS: Record<string, string> = {
  NEW: "Новый",
  USED: "Б/у",
  REFURBISHED: "Восстановленный",
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function parseProductDetail(raw: Record<string, unknown>): ProductDetailView {
  const id = String(raw.id ?? "");
  const title = String(raw.title ?? raw.name ?? "Товар");
  const price = readNumber(raw.price);
  const compareAtRaw = raw.compareAt != null ? readNumber(raw.compareAt, NaN) : null;
  const compareAt = compareAtRaw != null && Number.isFinite(compareAtRaw) ? compareAtRaw : null;
  const discount = discountPercent(price, compareAt);
  const stock = readNumber(raw.stock);
  const views = readNumber(raw.views);
  const favoritesCount = readNumber(raw.favoritesCount);
  const city = readString(raw.city);
  const condition = readString(raw.condition);
  const conditionLabel = condition ? CONDITION_LABELS[condition] ?? condition : null;
  const brand = raw.brand as { name?: string } | null | undefined;
  const brandName = readString(brand?.name);
  const pickupEnabled = Boolean(raw.pickupEnabled);

  const imagesRaw = (raw.images as ProductImage[] | undefined) ?? [];
  const primary = raw.primaryImage as { url?: string } | undefined;
  const images =
    imagesRaw.length > 0
      ? imagesRaw.filter((img) => Boolean(img?.url))
      : primary?.url
        ? [{ url: primary.url }]
        : [];

  const characteristics = ((raw.characteristics as ProductCharacteristic[] | undefined) ?? [])
    .filter((row) => row?.name && row?.displayValue)
    .map((row) => ({ name: row.name, displayValue: row.displayValue }));

  const pickupPoints = ((raw.pickupPoints as ProductPickupPoint[] | undefined) ?? []).filter(
    (point) => point?.name && point?.city,
  );

  const sellerRaw = raw.seller as Record<string, unknown> | undefined;
  const seller: ProductSeller | null = sellerRaw?.storeName
    ? {
        id: String(sellerRaw.id ?? ""),
        storeName: String(sellerRaw.storeName),
        slug: readString(sellerRaw.slug) ?? undefined,
        isVerified: Boolean(sellerRaw.isVerified),
        productCount: null,
      }
    : null;

  const category = raw.category as { id?: string; name?: string } | null | undefined;
  const categoryId = readString(category?.id);
  const categoryName = readString(category?.name);
  const description = readString(raw.description);

  const highlights = buildHighlights({
    stock,
    conditionLabel,
    brandName,
    city,
    pickupEnabled,
    pickupPointsCount: pickupPoints.length,
    favoritesCount,
    characteristics,
  });

  const trustItems = buildTrustItems({
    stock,
    sellerVerified: seller?.isVerified ?? false,
    pickupEnabled,
    pickupPointsCount: pickupPoints.length,
    favoritesCount,
    views,
  });

  return {
    id,
    title,
    description,
    price,
    compareAt,
    discount,
    stock,
    views,
    favoritesCount,
    city,
    condition,
    conditionLabel,
    brandName,
    pickupEnabled,
    images,
    characteristics,
    pickupPoints,
    seller,
    categoryId,
    categoryName,
    highlights,
    trustItems,
  };
}

function buildHighlights(input: {
  stock: number;
  conditionLabel: string | null;
  brandName: string | null;
  city: string | null;
  pickupEnabled: boolean;
  pickupPointsCount: number;
  favoritesCount: number;
  characteristics: ProductCharacteristic[];
}): string[] {
  const items: string[] = [];

  if (input.stock > 0) items.push("В наличии — можно заказать сейчас");
  if (input.conditionLabel) items.push(`Состояние: ${input.conditionLabel}`);
  if (input.brandName) items.push(`Бренд: ${input.brandName}`);
  if (input.city) items.push(`Город продавца: ${input.city}`);
  if (input.pickupEnabled && input.pickupPointsCount > 0) items.push("Доступен самовывоз из пункта выдачи");
  if (input.favoritesCount >= 5) items.push(`${input.favoritesCount} покупателей добавили в избранное`);

  for (const row of input.characteristics.slice(0, 4)) {
    const line = `${row.name}: ${row.displayValue}`;
    if (!items.includes(line) && items.length < 6) items.push(line);
  }

  return items.slice(0, 6);
}

function buildTrustItems(input: {
  stock: number;
  sellerVerified: boolean;
  pickupEnabled: boolean;
  pickupPointsCount: number;
  favoritesCount: number;
  views: number;
}): string[] {
  const items: string[] = [];

  if (input.sellerVerified) items.push("Проверенный продавец");
  items.push(input.stock > 0 ? "В наличии" : "Нет в наличии");
  if (input.pickupEnabled && input.pickupPointsCount > 0) items.push("Самовывоз доступен");
  if (input.favoritesCount > 0) items.push(`${input.favoritesCount} в избранном`);
  if (input.views > 0) items.push(`${input.views} просмотров`);

  return items;
}

export function mergeSellerProductCount(product: ProductDetailView, count: number | null): ProductDetailView {
  if (!product.seller || count == null) return product;
  return {
    ...product,
    seller: { ...product.seller, productCount: count },
  };
}

export type RelatedProduct = MobileProductListItem;
