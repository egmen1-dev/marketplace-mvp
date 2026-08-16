import { prisma } from "@/lib/prisma";

import { loadCategoryBenchmark } from "./category-context";
import { computeContextConfidence } from "./confidence";
import { buildDeviceContext } from "./device-context";
import { contextFingerprint } from "./fingerprint";
import { buildMarketContext, resolveMarketSeason } from "./market-context";
import { detectDaypart, CONTEXT_VERSION } from "./normalizers";
import { buildQueryContext } from "./query-context";
import {
  buildSellerContext,
  sellerLifecycleConfidence,
} from "./seller-context";
import type { CognitiveContext, DeviceType, LegacyCognitiveContextPatch, SessionGoal } from "./types";
import { createContextId } from "./types";

export type BuildCognitiveContextInput = {
  productId?: string;
  query?: string;
  device?: DeviceType | string;
  sessionGoal?: SessionGoal;
  country?: string;
  region?: string;
  at?: Date;
  overrides?: LegacyCognitiveContextPatch & {
    device?: DeviceType;
    season?: ReturnType<typeof resolveMarketSeason>;
  };
};

export async function buildCognitiveContext(
  input: BuildCognitiveContextInput = {},
): Promise<CognitiveContext> {
  let productName: string | undefined;
  let productPrice: number | undefined;
  let categoryId: string | null | undefined;
  let categoryName: string | undefined;
  let categorySlug: string | undefined;
  let sellerCompletedOrders = 0;
  let sellerTrust: number | null = null;

  if (input.productId) {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: { include: { reputation: true } },
      },
    });
    if (product) {
      productName = product.name;
      productPrice = Number(product.price);
      categoryId = product.categoryId;
      categoryName = product.category?.name ?? undefined;
      categorySlug = product.category?.slug ?? undefined;
      sellerCompletedOrders = product.seller.reputation?.completedOrders ?? 0;
      sellerTrust = product.seller.reputation?.trustScore ?? null;
    }
  }

  const queryCtx = input.query ? buildQueryContext(input.query) : undefined;
  const benchmark = await loadCategoryBenchmark(categoryId);
  const marketBase = buildMarketContext({
    country: input.country,
    region: input.region,
    at: input.at,
  });
  const season = input.overrides?.season ?? marketBase.season;
  const device = buildDeviceContext(input.overrides?.device ?? input.device);
  const seller = buildSellerContext({
    completedOrders: sellerCompletedOrders,
    trustScore: sellerTrust,
  });

  const buyerGoal = input.sessionGoal ?? (queryCtx?.intent.gift ? "gift" : "unknown");
  const buyerConfidence = queryCtx?.intent.gift ? 0.72 : 0.31;

  const confidence = computeContextConfidence({
    query: queryCtx?.confidence,
    category: benchmark.confidence,
    buyer: buyerConfidence,
    seller: sellerLifecycleConfidence(sellerCompletedOrders),
    device: device.type === "unknown" ? 0.2 : 0.75,
  });

  const seed = input.productId ?? queryCtx?.normalized ?? "global";
  const context: CognitiveContext = {
    id: input.overrides?.id ?? createContextId(seed),
    contextVersion: CONTEXT_VERSION,
    query: queryCtx,
    category: categoryId
      ? {
          id: categoryId,
          slug: categorySlug,
          name: categoryName,
          benchmarkRef: benchmark.source,
          benchmark,
        }
      : undefined,
    market: {
      ...marketBase,
      season,
      daypart: detectDaypart(input.at),
    },
    device,
    buyer: {
      sessionGoal: buyerGoal,
      confidence: buyerConfidence,
    },
    seller,
    product: input.productId
      ? { id: input.productId, name: productName ?? input.productId, price: productPrice }
      : undefined,
    confidence,
    fingerprint: "",
    createdAt: input.overrides?.createdAt ?? new Date().toISOString(),
  };

  context.fingerprint = contextFingerprint(context);
  return context;
}

export async function buildGlobalCategoryContext(
  input: Omit<BuildCognitiveContextInput, "productId"> & { categoryId?: string },
): Promise<CognitiveContext> {
  const benchmark = await loadCategoryBenchmark(input.categoryId ?? null);
  const queryCtx = input.query ? buildQueryContext(input.query) : undefined;
  const marketBase = buildMarketContext({ country: input.country, at: input.at });
  const device = buildDeviceContext(input.device);
  const confidence = computeContextConfidence({
    query: queryCtx?.confidence ?? 0.2,
    category: benchmark.confidence,
    device: device.type === "unknown" ? 0.2 : 0.7,
  });

  const context: CognitiveContext = {
    id: createContextId(input.query ?? input.categoryId ?? "global"),
    contextVersion: CONTEXT_VERSION,
    query: queryCtx,
    category: input.categoryId
      ? { id: input.categoryId, benchmarkRef: benchmark.source, benchmark }
      : undefined,
    market: { ...marketBase, daypart: detectDaypart(input.at) },
    device,
    buyer: { sessionGoal: input.sessionGoal ?? "unknown", confidence: 0.25 },
    seller: { lifecycle: "unknown" },
    confidence,
    fingerprint: "",
    createdAt: new Date().toISOString(),
  };
  context.fingerprint = contextFingerprint(context);
  return context;
}
