export type AccountMode = "buyer" | "seller";

export type UxNavItem = {
  href: string;
  label: string;
  icon: string;
};

export type UxEmptyState = {
  id: string;
  emoji: string;
  title: string;
  body: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
};

export type AccountOverviewSection = {
  id: string;
  title: string;
  items: Array<{
    label: string;
    value: string;
    href: string;
  }>;
};

export type AccountOverview = {
  enabled: boolean;
  mode: AccountMode;
  isSeller: boolean;
  profile: {
    name: string;
    email: string;
    phone: string | null;
    city: string | null;
    avatarUrl: string | null;
  };
  sections: AccountOverviewSection[];
};

export type BuyerOnboardingState = {
  enabled: boolean;
  showWelcome: boolean;
};

export type BuyerHomeContext = {
  enabled: boolean;
  greeting: string;
  favoritesCount: number;
  ordersCount: number;
  savedProductIds: string[];
};

export type SellerHomeSummary = {
  enabled: boolean;
  headline: string;
  stats: Array<{ label: string; value: string }>;
  nextStep: {
    title: string;
    why: string;
    benefit: string;
    ctaLabel: string;
    ctaHref: string;
  } | null;
  attention: string[];
};

export type PdpTrustUx = {
  enabled: boolean;
  sellerScore: number | null;
  productScore: number | null;
  reasons: string[];
};

export type PdpFitUx = {
  enabled: boolean;
  reasons: string[];
};

export type SettingsSection = {
  id: string;
  title: string;
  emoji: string;
  items: Array<{ label: string; href: string; hint?: string }>;
};

export type AiExplanation = {
  title: string;
  why: string;
  action: string;
  result: string;
  ctaLabel: string;
  ctaHref: string;
};

export type AdminUxOverview = {
  enabled: boolean;
  healthBlocks: Array<{ label: string; href: string; status: string }>;
  attention: string[];
  aiTips: string[];
};

export type SettingsUxView = {
  enabled: boolean;
  email: string;
  sections: SettingsSection[];
};
