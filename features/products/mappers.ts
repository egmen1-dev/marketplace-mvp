import { ProductCondition, Prisma } from "@prisma/client";

import type {
  ProductDetail,
  ProductImageDto,
  ProductListItem,
} from "@/features/products/types";
import { resolvePublicImageUrl } from "@/lib/images";

/** Russian labels for product condition (состояние). */
export const PRODUCT_CONDITION_LABELS: Record<ProductCondition, string> = {
  [ProductCondition.NEW]: "Новый",
  [ProductCondition.USED]: "Б/у",
  [ProductCondition.REFURBISHED]: "Восстановленный",
};

export function formatCondition(condition: ProductCondition): string {
  return PRODUCT_CONDITION_LABELS[condition] ?? condition;
}

/** Convert Prisma Decimal / number / string to a JS number (major RUB units). */
export function toPriceNumber(
  value: Prisma.Decimal | number | string | null | undefined,
): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value.toNumber();
}

/** Format price for Russian UI: "4 990 ₽" (deterministic; avoids SSR/client Intl mismatch). */
export function formatPrice(
  value: Prisma.Decimal | number | string,
  currency = "RUB",
): string {
  const amount = toPriceNumber(value);
  const isWhole = Math.abs(amount % 1) < 1e-9;
  const core = isWhole ? String(Math.round(amount)) : amount.toFixed(2);
  const [intPart, frac] = core.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  const number = frac != null ? `${grouped},${frac}` : grouped;
  if (currency === "RUB") return `${number}\u00a0₽`;
  return `${number}\u00a0${currency}`;
}

/** URL-safe slug from a title (Cyrillic transliteration + kebab). */
export function slugify(input: string): string {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  const lower = input.trim().toLowerCase();
  let out = "";
  for (const ch of lower) {
    if (map[ch] !== undefined) out += map[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else if (/\s|_/.test(ch)) out += "-";
    else if (ch === "-") out += "-";
  }
  return out.replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "product";
}

type ImageRow = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

type ListRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: Prisma.Decimal;
  compareAt: Prisma.Decimal | null;
  currency: string;
  stock: number;
  city: string | null;
  condition: ProductCondition;
  status: ProductListItem["status"];
  views: number;
  favoritesCount: number;
  createdAt: Date;
  category: { id: string; name: string; slug: string } | null;
  images: ImageRow[];
  seller: { id: string; storeName: string; slug: string };
};

type DetailRow = ListRow & {
  sku: string | null;
  weight: Prisma.Decimal | null;
  lengthCm: Prisma.Decimal | null;
  widthCm: Prisma.Decimal | null;
  heightCm: Prisma.Decimal | null;
  seoTitle: string | null;
  seoDescription: string | null;
  pickupEnabled: boolean;
  reservationEnabled: boolean;
  prepaymentPercent: number;
  productType?: {
    id: string;
    name: string;
    lotName: string | null;
    slug: string;
    categoryId: string;
  } | null;
  characteristicValues?: Array<{
    definitionId: string;
    valueText: string | null;
    valueNumber: Prisma.Decimal | null;
    valueBoolean: boolean | null;
    valueJson: unknown;
    definition: {
      id: string;
      name: string;
      slug: string;
      type: string;
      unit: string | null;
      sortOrder: number;
    };
  }>;
  pickupPoints?: {
    pickupPoint: {
      id: string;
      name: string;
      city: string;
      address: string;
      description: string | null;
      phone: string | null;
      workingHours: string | null;
      isActive: boolean;
    };
  }[];
  seller: {
    id: string;
    storeName: string;
    slug: string;
    isVerified: boolean;
    user: { id: string; name: string | null; image: string | null };
  };
};

function formatCharDisplay(v: NonNullable<DetailRow["characteristicValues"]>[number]): string {
  if (v.valueBoolean != null) return v.valueBoolean ? "Да" : "Нет";
  if (v.valueNumber != null) {
    const n = toPriceNumber(v.valueNumber);
    return v.definition.unit ? `${n} ${v.definition.unit}` : String(n);
  }
  if (Array.isArray(v.valueJson)) return v.valueJson.map(String).join(", ");
  return v.valueText?.trim() || "";
}

/** Raw value for product edit form inputs (no units / localized boolean). */
function formatCharFormValue(
  v: NonNullable<DetailRow["characteristicValues"]>[number],
): string {
  if (v.valueBoolean != null) return v.valueBoolean ? "true" : "false";
  if (v.valueNumber != null) return String(toPriceNumber(v.valueNumber));
  if (Array.isArray(v.valueJson)) return v.valueJson.map(String).join(",");
  return v.valueText?.trim() || "";
}

function mapImage(img: ImageRow): ProductImageDto {
  return {
    id: img.id,
    url: resolvePublicImageUrl(img.url) ?? img.url,
    alt: img.alt,
    sortOrder: img.sortOrder,
    isPrimary: img.isPrimary,
  };
}

function pickPrimary(images: ImageRow[]): ProductImageDto | null {
  if (images.length === 0) return null;
  const primary = images.find((i) => i.isPrimary) ?? images[0];
  return mapImage(primary);
}

export function mapProductListItem(row: ListRow): ProductListItem {
  return {
    id: row.id,
    title: row.name,
    slug: row.slug,
    description: row.description,
    price: toPriceNumber(row.price),
    compareAt: row.compareAt != null ? toPriceNumber(row.compareAt) : null,
    currency: row.currency,
    stock: row.stock,
    city: row.city,
    condition: row.condition,
    status: row.status,
    views: row.views,
    favoritesCount: row.favoritesCount,
    createdAt: row.createdAt.toISOString(),
    category: row.category,
    primaryImage: pickPrimary(row.images),
    seller: {
      id: row.seller.id,
      storeName: row.seller.storeName,
      slug: row.seller.slug,
    },
  };
}

export function mapProductDetail(row: DetailRow): ProductDetail {
  const base = mapProductListItem(row);
  const chars = [...(row.characteristicValues ?? [])].sort(
    (a, b) => a.definition.sortOrder - b.definition.sortOrder,
  );
  return {
    ...base,
    images: row.images.map(mapImage),
    sku: row.sku,
    weight: row.weight != null ? toPriceNumber(row.weight) : null,
    lengthCm: row.lengthCm != null ? toPriceNumber(row.lengthCm) : null,
    widthCm: row.widthCm != null ? toPriceNumber(row.widthCm) : null,
    heightCm: row.heightCm != null ? toPriceNumber(row.heightCm) : null,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    pickupEnabled: row.pickupEnabled ?? false,
    reservationEnabled: row.reservationEnabled ?? false,
    prepaymentPercent: row.prepaymentPercent ?? 0,
    productType: row.productType
      ? {
          id: row.productType.id,
          name: row.productType.lotName ?? row.productType.name,
          slug: row.productType.slug,
          categoryId: row.productType.categoryId,
        }
      : null,
    characteristics: chars.map((v) => ({
      definitionId: v.definitionId,
      name: v.definition.name,
      slug: v.definition.slug,
      unit: v.definition.unit,
      displayValue: formatCharDisplay(v),
      formValue: formatCharFormValue(v),
    })),
    pickupPoints: (row.pickupPoints ?? [])
      .map((l) => l.pickupPoint)
      .filter((p) => p.isActive)
      .map((p) => ({
        id: p.id,
        name: p.name,
        city: p.city,
        address: p.address,
        description: p.description,
        phone: p.phone,
        workingHours: p.workingHours,
        isActive: p.isActive,
      })),
    seller: {
      id: row.seller.id,
      storeName: row.seller.storeName,
      slug: row.seller.slug,
      isVerified: row.seller.isVerified,
      user: row.seller.user,
    },
  };
}

/** Days since create for «Новинка» badge. */
export const NEW_PRODUCT_DAYS = 14;

/** Hit threshold: views or favoritesCount. */
export const HIT_VIEWS_THRESHOLD = 40;
export const HIT_FAVORITES_THRESHOLD = 8;

export function isNewProduct(createdAt: string | Date, now = new Date()): boolean {
  const created =
    typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const ms = now.getTime() - created.getTime();
  return ms >= 0 && ms <= NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;
}

export function isHitProduct(views: number, favoritesCount: number): boolean {
  return views >= HIT_VIEWS_THRESHOLD || favoritesCount >= HIT_FAVORITES_THRESHOLD;
}

export function hasDiscount(
  price: number,
  compareAt: number | null | undefined,
): boolean {
  return typeof compareAt === "number" && compareAt > price;
}
