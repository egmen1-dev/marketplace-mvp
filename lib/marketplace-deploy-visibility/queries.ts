import { execSync } from "node:child_process";

import { getBuildInfo } from "@/lib/build-info";

import {
  MODULE_REGISTRY,
  REQUIRED_FLAG_ENV_VARS,
  STAGING_URL,
  buildAllModuleRows,
  readFlagStatus,
} from "./registry";
import type { DemoScenario, DeployShaSnapshot, MarketplaceDebugSnapshot, SystemFlagsSnapshot } from "./types";

function safeGit(command: string): string | null {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

export async function fetchRemoteSha(url: string): Promise<string | null> {
  try {
    const response = await fetch(`${url}/api/version`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { commit?: string };
    return data.commit ?? null;
  } catch {
    return null;
  }
}

export function getDeployShaSnapshot(stagingSha: string | null = null): DeployShaSnapshot {
  const mainSha = safeGit("git rev-parse origin/main") ?? "unknown";
  const headSha = safeGit("git rev-parse HEAD") ?? "unknown";
  const ahead = safeGit("git rev-list --count origin/main..HEAD");

  return {
    currentHead: headSha.slice(0, 7),
    mainSha: mainSha.slice(0, 7),
    stagingSha,
    productionSha: null,
    stagingUrl: STAGING_URL,
    commitsAheadOfMain: ahead ? Number(ahead) : null,
  };
}

export async function getSystemFlagsSnapshot(): Promise<SystemFlagsSnapshot> {
  const build = getBuildInfo();
  const stagingSha = await fetchRemoteSha(STAGING_URL);

  return {
    enabled: true,
    environment: build.environment,
    buildCommit: build.commit,
    buildTime: build.buildTime,
    deploy: getDeployShaSnapshot(stagingSha),
    modules: buildAllModuleRows(),
    requiredFlags: REQUIRED_FLAG_ENV_VARS.map((envVar) => ({
      envVar,
      status: readFlagStatus(envVar),
    })),
  };
}

export function getMarketplaceDebugSnapshot(): MarketplaceDebugSnapshot {
  const build = getBuildInfo();
  const modules = buildAllModuleRows();
  const activeModules = modules.filter((m) => m.flagStatus === "ON" && m.codeExists).map((m) => m.name);
  const inactiveModules = modules.filter((m) => m.flagStatus === "OFF" || !m.codeExists).map((m) => m.name);

  return {
    enabled: true,
    buildCommit: build.commit,
    environment: build.environment,
    activeModules,
    inactiveModules,
  };
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "new_seller",
    title: "Новый продавец",
    sellerEmail: "demo-new-seller@demo.lot",
    sellerPassword: "demo1234",
    validatesModules: ["New Seller Trust", "Trust Experience", "Seller First Entry"],
    setup: [
      "0 заказов, 1 товар, 0 отзывов",
      "Проверить /product/[id] — блок «Покупка защищена»",
      "Проверить /account/reputation — Trust Progress",
    ],
  },
  {
    id: "developing_seller",
    title: "Развивающийся продавец",
    sellerEmail: "demo-growing@demo.lot",
    sellerPassword: "demo1234",
    validatesModules: ["Trust Experience", "Trust Score Model", "Seller Journey"],
    setup: [
      "10+ заказов, рейтинг 4.5+, отзывы",
      "Проверить trust tier «Развивается»",
      "Проверить /account/business — AI summary",
    ],
  },
  {
    id: "problem_seller",
    title: "Продавец с проблемами",
    sellerEmail: "demo-problems@demo.lot",
    sellerPassword: "demo1234",
    validatesModules: ["Seller Business Intelligence", "Conversion Audit"],
    setup: [
      "Поздняя отправка, мало фото, низкая конверсия",
      "Проверить /account/business — диагностика",
      "Проверить trust feedback panel",
    ],
  },
];

export function getDemoScenarios(): DemoScenario[] {
  return DEMO_SCENARIOS;
}

export function getRouteAuditChecklist(): Array<{ area: string; routes: string[]; checks: string[] }> {
  return [
    {
      area: "Buyer",
      routes: ["/", "/catalog", "/product/[id]", "/favorites", "/orders", "/account"],
      checks: [
        "Белая тема (ThemeProvider defaultTheme=light)",
        "Header DESIGN-001",
        "Discovery блоки (MARKETPLACE_DISCOVERY_ENABLED)",
        "Trust блоки (Trust Loop + Experience flags)",
        "Отзывы на PDP (Trust Loop + данные)",
        "Доставка (MARKETPLACE_DELIVERY_ENABLED)",
      ],
    },
    {
      area: "Seller",
      routes: [
        "/account/business",
        "/account/reputation",
        "/account/balance",
        "/account/payouts",
        "/account/promotion-center",
        "/account/seller-start",
      ],
      checks: [
        "Seller onboarding (SELLER_FIRST_ENTRY / SELLER_JOURNEY)",
        "Business dashboard (SELLER_BUSINESS_INTELLIGENCE)",
        "Trust center (/account/reputation)",
        "Payout (SELLER_PAYOUT_ENABLED + balance)",
        "Promotion center (placeholder until PR #38)",
      ],
    },
  ];
}

export { MODULE_REGISTRY, STAGING_URL };
