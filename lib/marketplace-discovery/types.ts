import type { ProductListItem } from "@/features/products/types";

export type DiscoveryWhyReason = {
  id: string;
  label: string;
};

export type DiscoveryProductCard = {
  product: ProductListItem;
  reasons: DiscoveryWhyReason[];
};

export type DiscoveryFeedSection = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  items: DiscoveryProductCard[];
  href?: string;
};

export type DiscoveryHomeFeed = {
  enabled: boolean;
  dailyFind: DiscoveryProductCard | null;
  sections: DiscoveryFeedSection[];
};

export type DiscoverySituation = {
  id: string;
  emoji: string;
  label: string;
  queryHint: string;
  maxPrice?: number;
};

export type DiscoveryCollection = {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  title: string;
  description: string;
  explanation: string;
  maxPrice?: number;
  minTrustScore?: number;
  sort: "popular" | "newest" | "price_asc" | "price_desc";
};

export type DiscoveryCollectionPage = {
  enabled: boolean;
  collection: DiscoveryCollection;
  items: DiscoveryProductCard[];
};

export type PriceGameOption = {
  price: number;
  label: string;
};

export type PriceGameRound = {
  product: ProductListItem;
  options: PriceGameOption[];
  correctIndex: number;
  reasons: DiscoveryWhyReason[];
};

export type BuyerStory = {
  id: string;
  city: string;
  reason: string;
  productTitle: string;
  productId: string;
};

export type SellerDiscoveryTips = {
  enabled: boolean;
  canAppear: boolean;
  blockers: string[];
  strengths: string[];
};

export type AdminDiscoveryDashboard = {
  enabled: boolean;
  topCollections: Array<{ slug: string; title: string; views: number }>;
  topClicks: Array<{ productId: string; title: string; clicks: number }>;
  opportunities: string[];
  sectionViews: Array<{ section: string; views: number }>;
};

export type DailyFind = {
  enabled: boolean;
  ready: boolean;
  item: DiscoveryProductCard | null;
  personalized: boolean;
};
