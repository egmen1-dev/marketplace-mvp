import { existsSync } from "node:fs";
import { join } from "node:path";

import type { FlagStatus, ModuleVisibilityRow } from "./types";

export type ModuleRegistryEntry = {
  id: string;
  name: string;
  envVar: string;
  /** Marker file that proves module code is present in this build. */
  markerPath: string;
  /** Whether this module's code is on origin/main (audit snapshot 2026-08-14). */
  onMainBranch: boolean;
  prNumber: number | null;
  buyerRoutes: string[];
  sellerRoutes: string[];
  adminRoutes: string[];
  defaultBlockers: string[];
};

export const STAGING_URL = "https://web-production-e56fb.up.railway.app";

export const MODULE_REGISTRY: ModuleRegistryEntry[] = [
  {
    id: "ux_completion",
    name: "Marketplace UX Completion",
    envVar: "MARKETPLACE_UX_COMPLETION_ENABLED",
    markerPath: "lib/marketplace-ux-completion/flags.ts",
    onMainBranch: false,
    prNumber: 52,
    buyerRoutes: ["/", "/product/[id]"],
    sellerRoutes: ["/account"],
    adminRoutes: ["/admin/dashboard", "/admin/ux-health"],
    defaultBlockers: ["Не смержено в main", "Flag OFF по умолчанию"],
  },
  {
    id: "trust_loop",
    name: "Trust Loop",
    envVar: "MARKETPLACE_TRUST_LOOP_ENABLED",
    markerPath: "lib/marketplace-trust-loop/flags.ts",
    onMainBranch: false,
    prNumber: 47,
    buyerRoutes: ["/product/[id]"],
    sellerRoutes: ["/account/reputation"],
    adminRoutes: ["/admin/trust", "/admin/moderation"],
    defaultBlockers: ["Не смержено в main", "Нет отзывов у товара"],
  },
  {
    id: "trust_score",
    name: "Trust Score Model",
    envVar: "MARKETPLACE_TRUST_SCORE_MODEL_ENABLED",
    markerPath: "lib/marketplace-trust-score/flags.ts",
    onMainBranch: false,
    prNumber: 55,
    buyerRoutes: ["/product/[id]"],
    sellerRoutes: ["/account/reputation"],
    adminRoutes: ["/admin/trust-center"],
    defaultBlockers: ["Требует MARKETPLACE_TRUST_LOOP_ENABLED", "Не смержено в main"],
  },
  {
    id: "trust_experience",
    name: "Trust Experience",
    envVar: "MARKETPLACE_TRUST_EXPERIENCE_ENABLED",
    markerPath: "lib/marketplace-trust-experience/flags.ts",
    onMainBranch: false,
    prNumber: 56,
    buyerRoutes: ["/product/[id]"],
    sellerRoutes: ["/account/reputation"],
    adminRoutes: ["/admin/trust-center"],
    defaultBlockers: ["Требует Trust Score + Loop", "Не смержено в main"],
  },
  {
    id: "new_seller_trust",
    name: "New Seller Trust",
    envVar: "MARKETPLACE_NEW_SELLER_TRUST_ENABLED",
    markerPath: "lib/marketplace-new-seller-trust/flags.ts",
    onMainBranch: false,
    prNumber: 57,
    buyerRoutes: ["/product/[id]"],
    sellerRoutes: ["/account/reputation"],
    adminRoutes: ["/admin/trust-center"],
    defaultBlockers: ["Продавец с историей заказов — блок скрыт", "Не смержено в main"],
  },
  {
    id: "trust_conversion",
    name: "Trust Conversion",
    envVar: "MARKETPLACE_TRUST_CONVERSION_ENABLED",
    markerPath: "lib/marketplace-trust-conversion/flags.ts",
    onMainBranch: false,
    prNumber: 58,
    buyerRoutes: ["/product/[id]"],
    sellerRoutes: ["/account/reputation"],
    adminRoutes: ["/admin/trust-center"],
    defaultBlockers: ["Не смержено в main", "Flag OFF по умолчанию"],
  },
  {
    id: "seller_business",
    name: "Seller Business Intelligence",
    envVar: "SELLER_BUSINESS_INTELLIGENCE_ENABLED",
    markerPath: "lib/seller-business-intelligence/flags.ts",
    onMainBranch: false,
    prNumber: 45,
    buyerRoutes: [],
    sellerRoutes: ["/account/business"],
    adminRoutes: [],
    defaultBlockers: ["Не смержено в main", "Нужен seller с заказами для AI summary"],
  },
  {
    id: "seller_journey",
    name: "Seller Journey",
    envVar: "SELLER_JOURNEY_ENABLED",
    markerPath: "lib/seller-journey/flags.ts",
    onMainBranch: false,
    prNumber: 42,
    buyerRoutes: [],
    sellerRoutes: ["/account", "/account/seller-start", "/account/growth"],
    adminRoutes: [],
    defaultBlockers: ["Не смержено в main", "Перекрывает Seller Lifecycle nav"],
  },
  {
    id: "seller_first_entry",
    name: "Seller First Entry",
    envVar: "SELLER_FIRST_ENTRY_ENABLED",
    markerPath: "lib/seller-first-entry/flags.ts",
    onMainBranch: false,
    prNumber: 41,
    buyerRoutes: [],
    sellerRoutes: ["/account/seller-start", "/account/promotion-center"],
    adminRoutes: [],
    defaultBlockers: ["Не смержено в main"],
  },
  {
    id: "seller_operating_desk",
    name: "Seller Operating Desk",
    envVar: "SELLER_OPERATING_DESK_ENABLED",
    markerPath: "lib/seller-operating-desk/flags.ts",
    onMainBranch: false,
    prNumber: 43,
    buyerRoutes: [],
    sellerRoutes: ["/account/business"],
    adminRoutes: [],
    defaultBlockers: ["Не смержено в main"],
  },
  {
    id: "seller_operations",
    name: "Seller Operations",
    envVar: "SELLER_OPERATIONS_ENABLED",
    markerPath: "lib/seller-operations/flags.ts",
    onMainBranch: false,
    prNumber: 44,
    buyerRoutes: [],
    sellerRoutes: ["/account/business"],
    adminRoutes: [],
    defaultBlockers: ["Не смержено в main"],
  },
  {
    id: "promotion_center",
    name: "Promotion Center",
    envVar: "SELLER_PROMOTION_CENTER_ENABLED",
    markerPath: "lib/seller-promotion-center/flags.ts",
    onMainBranch: false,
    prNumber: 38,
    buyerRoutes: [],
    sellerRoutes: ["/account/promotion-center"],
    adminRoutes: [],
    defaultBlockers: ["PR #38 не смержен — placeholder страница", "Marker file отсутствует в текущей ветке"],
  },
  {
    id: "seller_payout",
    name: "Seller Payout",
    envVar: "SELLER_PAYOUT_ENABLED",
    markerPath: "lib/seller-payout/flags.ts",
    onMainBranch: false,
    prNumber: 39,
    buyerRoutes: [],
    sellerRoutes: ["/account/payouts", "/account/balance"],
    adminRoutes: ["/admin/payouts"],
    defaultBlockers: ["Не смержено в main", "Нужен баланс > 0 для UI"],
  },
  {
    id: "discovery",
    name: "Discovery",
    envVar: "MARKETPLACE_DISCOVERY_ENABLED",
    markerPath: "lib/marketplace-discovery/flags.ts",
    onMainBranch: false,
    prNumber: 50,
    buyerRoutes: ["/", "/product/[id]", "/discover/collections/[slug]"],
    sellerRoutes: ["/account/discovery"],
    adminRoutes: ["/admin/discovery"],
    defaultBlockers: ["Не смержено в main", "Блоки на homepage скрыты без flag"],
  },
  {
    id: "social_growth",
    name: "Social Growth",
    envVar: "MARKETPLACE_SOCIAL_GROWTH_ENABLED",
    markerPath: "lib/marketplace-social-growth/flags.ts",
    onMainBranch: false,
    prNumber: 51,
    buyerRoutes: ["/social"],
    sellerRoutes: ["/account/social-tools"],
    adminRoutes: ["/admin/social-growth"],
    defaultBlockers: ["Не смержено в main"],
  },
  {
    id: "conversion",
    name: "Conversion Audit",
    envVar: "MARKETPLACE_CONVERSION_ENABLED",
    markerPath: "lib/marketplace-conversion/flags.ts",
    onMainBranch: false,
    prNumber: 53,
    buyerRoutes: ["/product/[id]"],
    sellerRoutes: ["/account/business"],
    adminRoutes: ["/admin/conversion"],
    defaultBlockers: ["Не смержено в main", "Diagnostics только для seller/admin"],
  },
];

export const REQUIRED_FLAG_ENV_VARS = MODULE_REGISTRY.map((m) => m.envVar);

export function readFlagStatus(envVar: string): FlagStatus {
  return process.env[envVar] === "true" ? "ON" : "OFF";
}

export function markerFileExists(markerPath: string): boolean {
  return existsSync(join(process.cwd(), markerPath));
}

export function buildModuleVisibilityRow(entry: ModuleRegistryEntry): ModuleVisibilityRow {
  const flagStatus = readFlagStatus(entry.envVar);
  const codeExists = markerFileExists(entry.markerPath);
  const connectedToUi = codeExists && entry.adminRoutes.length + entry.sellerRoutes.length + entry.buyerRoutes.length > 0;
  const visibleOnStaging = entry.onMainBranch && flagStatus === "ON" && codeExists && connectedToUi;

  const blockers = [...entry.defaultBlockers];
  if (flagStatus === "OFF") blockers.unshift(`Flag ${entry.envVar}=false`);
  if (!codeExists) blockers.unshift("Код модуля отсутствует в этой сборке");
  if (!entry.onMainBranch) blockers.unshift("Не задеплоено: Railway → main (PR draft)");

  return {
    id: entry.id,
    name: entry.name,
    envVar: entry.envVar,
    flagStatus,
    codeExists,
    connectedToUi,
    onMainBranch: entry.onMainBranch,
    visibleOnStaging,
    buyerRoutes: entry.buyerRoutes,
    sellerRoutes: entry.sellerRoutes,
    adminRoutes: entry.adminRoutes,
    blockers: [...new Set(blockers)],
    prNumber: entry.prNumber,
  };
}

export function buildAllModuleRows(): ModuleVisibilityRow[] {
  return MODULE_REGISTRY.map(buildModuleVisibilityRow);
}
