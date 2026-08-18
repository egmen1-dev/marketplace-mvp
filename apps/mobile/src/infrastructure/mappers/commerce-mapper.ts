import { loadAppConfig } from "../../config/env";
import { resolveImageUrl } from "../../utils/format";
import type { Category, CatalogPage, ProductDetail, ProductSummary } from "../../domain/contracts/entities/catalog";
import type { Cart, CartLine } from "../../domain/contracts/entities/cart";
import type { UserProfile } from "../../domain/contracts/entities/profile";
import type { Session, AccessToken, LoginCredentials } from "../../domain/contracts/entities/session";
import { categoryId, productId, sellerId } from "../../domain/contracts/value-objects/ids";
import { money } from "../../domain/contracts/value-objects/money";

export type MobileProductListDto = {
  id: string;
  title: string;
  price: number;
  compareAt?: number | null;
  stock?: number;
  status?: string;
  favoritesCount?: number;
  views?: number;
  sku?: string | null;
  ordersCount?: number;
  updatedAt?: string;
  createdAt?: string;
  moderation?: { status: string; reason: string | null; updatedAt: string } | null;
  primaryImage?: { url: string } | null;
  seller?: { storeName?: string; id?: string };
  category?: { id: string; name: string; slug?: string } | null;
  images?: Array<{ url: string }>;
  description?: string | null;
  city?: string | null;
  condition?: string;
};

export type CatalogPageDto = {
  items: MobileProductListDto[];
  nextCursor: string | null;
  hasMore?: boolean;
};

export type CategoryDto = { id: string; name: string; slug?: string; productCount?: number };

export type CartApiDto = {
  items: Array<{
    productId: string;
    quantity: number;
    lineTotal: number;
    product?: {
      id?: string;
      title?: string;
      price?: number;
      stock?: number;
      primaryImage?: { url?: string } | null;
      seller?: { id?: string; storeName?: string };
    };
  }>;
  itemCount: number;
  subtotal: number;
  currency: string;
};

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function mapProductSummaryDto(dto: MobileProductListDto, isFavorite = false): ProductSummary {
  const currency = "RUB";
  return {
    id: productId(dto.id),
    title: dto.title,
    price: money(dto.price, currency),
    compareAt: dto.compareAt != null ? money(dto.compareAt, currency) : null,
    imageUrl: dto.primaryImage?.url ?? null,
    sellerName: dto.seller?.storeName ?? null,
    sellerId: dto.seller?.id ? sellerId(dto.seller.id) : null,
    stock: dto.stock ?? 0,
    isFavorite,
    favoritesCount: dto.favoritesCount ?? 0,
    city: dto.city ?? null,
  };
}

export function mapProductDetailDto(raw: Record<string, unknown>, isFavorite = false): ProductDetail {
  const dto = raw as MobileProductListDto & {
    specs?: Array<{ label: string; value: string }>;
    highlights?: string[];
    gallery?: string[];
    relatedProductIds?: string[];
  };
  const summary = mapProductSummaryDto(dto, isFavorite);
  const gallery =
    dto.gallery ??
    (Array.isArray(dto.images) ? dto.images.map((img) => img.url).filter(Boolean) : []);
  return {
    ...summary,
    description: dto.description ?? null,
    specs: dto.specs ?? [],
    highlights: dto.highlights ?? [],
    gallery,
    relatedProductIds: (dto.relatedProductIds ?? []).map(productId),
  };
}

export function mapCatalogPageDto(dto: CatalogPageDto): CatalogPage {
  return {
    items: dto.items.map((item) => mapProductSummaryDto(item)),
    nextCursor: dto.nextCursor,
    fromCache: false,
  };
}

export function mapCategoryDto(dto: CategoryDto): Category {
  return {
    id: categoryId(dto.id),
    name: dto.name,
    slug: dto.slug ?? null,
  };
}

export function mapCartDto(raw: CartApiDto | Record<string, unknown>): Cart {
  const dto = raw as CartApiDto;
  const config = loadAppConfig();
  const currency = dto.currency ?? "RUB";
  const lines: CartLine[] = (dto.items ?? []).map((line) => {
    const product = line.product ?? {};
    const unitPrice = readNumber(product.price);
    const quantity = Math.max(1, readNumber(line.quantity, 1));
    const lineTotalAmount = readNumber(line.lineTotal, unitPrice * quantity);
    const imageRaw = product.primaryImage?.url ?? null;
    return {
      productId: productId(String(line.productId ?? product.id ?? "")),
      title: String(product.title ?? "Товар"),
      quantity,
      unitPrice: money(unitPrice, currency),
      lineTotal: money(lineTotalAmount, currency),
      imageUrl: imageRaw ? resolveImageUrl(imageRaw, config.apiBaseUrl) : null,
      sellerId: product.seller?.id ? sellerId(product.seller.id) : null,
      stock: readNumber(product.stock),
    };
  });

  const subtotal = readNumber(dto.subtotal, lines.reduce((acc, l) => acc + l.lineTotal.amount, 0));
  return {
    lines,
    itemCount: readNumber(dto.itemCount, lines.reduce((acc, l) => acc + l.quantity, 0)),
    subtotal: money(subtotal, currency),
    savings: money(0, currency),
    updatedAt: new Date().toISOString(),
  };
}

export function mapSessionFromLogin(data: {
  userId: string;
  role?: string;
  sessionId: string;
  expiresIn?: number;
  accessToken: string;
}): Session {
  const expiresAt =
    data.expiresIn != null ? new Date(Date.now() + data.expiresIn * 1000).toISOString() : null;
  return {
    userId: data.userId,
    email: null,
    role: (data.role as Session["role"]) ?? "BUYER",
    sellerCapable: data.role === "SELLER" || data.role === "ADMIN",
    sessionId: data.sessionId,
    expiresAt,
  };
}

export function mapAccessToken(token: string, expiresIn?: number): AccessToken {
  return {
    token,
    expiresAt: expiresIn != null ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
  };
}

export function mapProfileFromSession(session: Session, mode: UserProfile["mode"]): UserProfile {
  return {
    email: session.email ?? session.userId,
    displayName: session.email ?? session.userId,
    mode,
    sellerCapable: session.sellerCapable,
  };
}

export function mapLoginCredentials(credentials: LoginCredentials): LoginCredentials {
  return credentials;
}
