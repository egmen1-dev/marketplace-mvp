import type { ProductListItem } from "@/features/products/types";

export type ShareCardFormat = "story" | "post" | "vertical" | "mobile";

export type ShareCardData = {
  productId: string;
  title: string;
  headline: string;
  priceLabel: string;
  imageUrl: string | null;
  reasons: string[];
  ctaLabel: string;
  shareUrl: string;
  format: ShareCardFormat;
};

export type ViralFormatId =
  | "price-surprise"
  | "daily-find"
  | "before-after"
  | "why-buy";

export type ViralContent = {
  formatId: ViralFormatId;
  headline: string;
  body: string;
  bullets: string[];
  product: ProductListItem;
  allowed: boolean;
  blockers: string[];
};

export type SocialLandingPage = {
  slug: string;
  path: string;
  seoTitle: string;
  seoDescription: string;
  title: string;
  description: string;
  sharePreview: string;
  sort: "popular" | "newest" | "price_asc" | "price_desc";
  maxPrice?: number;
  queryHint?: string;
};

export type SocialLandingView = {
  enabled: boolean;
  page: SocialLandingPage;
  items: Array<{ product: ProductListItem; reasons: string[] }>;
};

export type UserCollectionSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  productCount: number;
  coverImageUrl: string | null;
  sharePath: string;
};

export type CreatorCollectionView = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  creatorName: string;
  views: number;
  likes: number;
  items: Array<{ product: ProductListItem; reasons: string[] }>;
  sharePath: string;
};

export type SellerSocialContentOption = {
  id: string;
  label: string;
  formatId: ViralFormatId;
};

export type SellerSocialTools = {
  enabled: boolean;
  productId: string;
  productTitle: string;
  canGenerate: boolean;
  blockers: string[];
  options: SellerSocialContentOption[];
};

export type AdminSocialGrowthDashboard = {
  enabled: boolean;
  topShareCards: Array<{ productId: string; views: number }>;
  topSharedProducts: Array<{ productId: string; shares: number }>;
  creatorStats: Array<{ collectionId: string; title: string; views: number }>;
  opportunities: string[];
};

export type SocialContentValidation = {
  allowed: boolean;
  blockers: string[];
  warnings: string[];
};
