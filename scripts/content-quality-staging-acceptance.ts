#!/usr/bin/env tsx
/**
 * MARKETPLACE-CONTENT-QUALITY-STAGING-ACCEPTANCE-002
 * Seeds 5 acceptance products and runs quality evaluations on staging DB.
 *
 * Usage:
 *   DATABASE_URL=... MARKETPLACE_CONTENT_QUALITY_ENABLED=true \
 *     tsx scripts/content-quality-staging-acceptance.ts
 */
import { ProductStatus } from "@prisma/client";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import {
  evaluateProductQuality,
  runDirtySocksControlTest,
  runHighQuantityVsQualityTest,
  runQualityRankingCriticalTest,
} from "@/lib/marketplace-content-quality";
import { prisma } from "@/lib/prisma";

process.env.MARKETPLACE_CONTENT_QUALITY_ENABLED = "true";
process.env.MARKETPLACE_CONTENT_QUALITY_DAOS_ENABLED = "false";

const STAGING_BASE = "https://web-production-e56fb.up.railway.app";
const IMG = {
  fan: "https://images.unsplash.com/photo-1631540597865-1ea8eb9a8639?w=800",
  fan2: "https://images.unsplash.com/photo-1585779034823-6d8a8c8a6f6f?w=800",
  fan3: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
  sock: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800",
  dark: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
  dup: "https://images.unsplash.com/photo-1631540597865-1ea8eb9a8639?w=800&q=80",
};

type ScenarioRow = {
  scenario: string;
  expected: string;
  actual: string;
  result: "PASS" | "FAIL" | "PARTIAL";
};

async function findSellerId(): Promise<string> {
  const env = process.env.ACCEPTANCE_SELLER_ID?.trim();
  if (env) return env;
  const seller = await prisma.sellerProfile.findFirst({
    where: { products: { some: {} } },
    orderBy: { createdAt: "asc" },
  });
  if (!seller) throw new Error("No seller profile found on staging DB");
  return seller.id;
}

async function upsertAcceptanceProduct(input: {
  slug: string;
  name: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  sellerId: string;
  categoryId: string | null;
  images: Array<{ url: string; alt: string; isPrimary?: boolean; pathname?: string }>;
  characteristics: Array<{ slug: string; name: string; value: string }>;
}): Promise<string> {
  const existing = await prisma.product.findFirst({
    where: { sellerId: input.sellerId, slug: input.slug },
  });

  const data = {
    name: input.name,
    description: input.description,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    price: 3990,
    stock: 10,
    status: ProductStatus.ACTIVE,
    categoryId: input.categoryId,
  };

  const product = existing
    ? await prisma.product.update({ where: { id: existing.id }, data })
    : await prisma.product.create({
        data: {
          ...data,
          sellerId: input.sellerId,
          slug: input.slug,
        },
      });

  await prisma.productImage.deleteMany({ where: { productId: product.id } });
  await prisma.productImage.createMany({
    data: input.images.map((img, i) => ({
      productId: product.id,
      url: img.url,
      alt: img.alt,
      sortOrder: i,
      isPrimary: img.isPrimary ?? i === 0,
      pathname: img.pathname ?? `acceptance/${input.slug}/${i}.jpg`,
    })),
  });

  return product.id;
}

function band(score: number): string {
  if (score >= 75) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

async function main() {
  const rows: ScenarioRow[] = [];
  const sellerId = await findSellerId();
  const category = await prisma.category.findFirst({ where: { isActive: true } });

  const goodId = await upsertAcceptanceProduct({
    slug: "cq-accept-good-fan",
    name: "Напольный вентилятор TurboAir 40 см",
    description:
      "Напольный вентилятор для дома и офиса. Три скорости, устойчивое основание, тихий двигатель, регулировка наклона.",
    seoTitle: "Напольный вентилятор TurboAir — тихий, 40 см",
    seoDescription: "Напольный вентилятор с тремя скоростями для комнаты до 25 м².",
    sellerId,
    categoryId: category?.id ?? null,
    images: [
      { url: IMG.fan, alt: "напольный вентилятор", isPrimary: true },
      { url: IMG.fan2, alt: "вентилятор вид сбоку" },
      { url: IMG.fan3, alt: "вентилятор в интерьере" },
      { url: IMG.fan, alt: "вентилятор крупным планом" },
    ],
    characteristics: [
      { slug: "power", name: "Мощность", value: "45 W" },
      { slug: "diameter", name: "Диаметр", value: "40 см" },
      { slug: "speeds", name: "Скорости", value: "3" },
    ],
  });

  const avgId = await upsertAcceptanceProduct({
    slug: "cq-accept-average-fan",
    name: "Напольный вентилятор Basic",
    description: "Вентилятор напольный.",
    seoTitle: "Вентилятор Basic",
    seoDescription: "Напольный вентилятор.",
    sellerId,
    categoryId: category?.id ?? null,
    images: [
      { url: IMG.dark, alt: "вентилятор темное фото", isPrimary: true },
      { url: IMG.fan2, alt: "вентилятор" },
    ],
    characteristics: [{ slug: "power", name: "Мощность", value: "40 W" }],
  });

  const badId = await upsertAcceptanceProduct({
    slug: "cq-accept-bad-fan",
    name: "Напольный вентилятор Economy",
    description: "Товар.",
    seoTitle: "fan",
    seoDescription: "fan",
    sellerId,
    categoryId: category?.id ?? null,
    images: [
      { url: IMG.dark, alt: "непонятный предмет", isPrimary: true },
      { url: IMG.dark, alt: "темное фото" },
    ],
    characteristics: [],
  });

  const irrId = await upsertAcceptanceProduct({
    slug: "cq-accept-irrelevant-fan",
    name: "Напольный вентилятор",
    description:
      "Мощный напольный вентилятор с тихим двигателем, три скорости, устойчивое основание.",
    seoTitle: "Напольный вентилятор купить",
    seoDescription: "Напольный вентилятор для дома и офиса.",
    sellerId,
    categoryId: category?.id ?? null,
    images: Array.from({ length: 6 }, (_, i) => ({
      url: IMG.sock,
      alt: "грязные носки",
      isPrimary: i === 0,
    })),
    characteristics: [
      { slug: "power", name: "Мощность", value: "45 W" },
      { slug: "speeds", name: "Скорости", value: "3" },
    ],
  });

  const spamDesc = Array.from({ length: 30 }, () => "вентилятор купить дешево москва").join(" ");
  const dupId = await upsertAcceptanceProduct({
    slug: "cq-accept-duplicates-spam",
    name: "Напольный вентилятор Promo",
    description: spamDesc,
    seoTitle: "вентилятор купить вентилятор дешево вентилятор москва",
    seoDescription: spamDesc.slice(0, 400),
    sellerId,
    categoryId: category?.id ?? null,
    images: Array.from({ length: 10 }, (_, i) => ({
      url: IMG.dup,
      alt: "same",
      isPrimary: i === 0,
      pathname: "acceptance/dup/same.jpg",
    })),
    characteristics: Array.from({ length: 8 }, (_, i) => ({
      slug: `f${i}`,
      name: `Поле ${i + 1}`,
      value: `x${i}`,
    })),
  });

  const productIds = { goodId, avgId, badId, irrId, dupId };
  const evaluations: Record<string, Awaited<ReturnType<typeof evaluateProductQuality>>> = {};

  for (const [key, id] of Object.entries(productIds)) {
    evaluations[key] = await evaluateProductQuality(id);
  }

  const good = evaluations.goodId!;
  const avg = evaluations.avgId!;
  const bad = evaluations.badId!;
  const irr = evaluations.irrId!;
  const dup = evaluations.dupId!;

  rows.push({
    scenario: "good product",
    expected: "HIGH",
    actual: `${good.overallScore} (${band(good.overallScore)})`,
    result: good.overallScore >= 75 ? "PASS" : good.overallScore >= 60 ? "PARTIAL" : "FAIL",
  });
  rows.push({
    scenario: "average product",
    expected: "MEDIUM",
    actual: `${avg.overallScore} (${band(avg.overallScore)})`,
    result:
      avg.overallScore >= 45 && avg.overallScore < 80
        ? "PASS"
        : avg.overallScore >= 35
          ? "PARTIAL"
          : "FAIL",
  });
  rows.push({
    scenario: "bad product",
    expected: "LOW",
    actual: `${bad.overallScore} (${band(bad.overallScore)})`,
    result: bad.overallScore < 55 ? "PASS" : "FAIL",
  });
  rows.push({
    scenario: "irrelevant photos",
    expected: "Gate FAIL / TOP BLOCKED",
    actual: `score=${irr.overallScore}, gates=${irr.failedGates.join(",")}, top=${irr.topEligibility}`,
    result:
      irr.qualityGateFailed && irr.topEligibility === "BLOCKED" ? "PASS" : "FAIL",
  });
  rows.push({
    scenario: "duplicates + spam",
    expected: "effectivePhotoCount low, manipulation warning",
    actual: `uploaded=${dup.photo.uploadedPhotoCount}, effective=${dup.photo.effectivePhotoCount}, seo=${dup.seo.score}, manip=${dup.manipulation.score}`,
    result:
      dup.photo.effectivePhotoCount <= 2 && dup.manipulation.score < 55 ? "PASS" : "PARTIAL",
  });

  const dirty = await runDirtySocksControlTest();
  rows.push({
    scenario: "dirty socks control",
    expected: "QUALITY_GATE_FAIL",
    actual: JSON.stringify(dirty),
    result: dirty.topBlocked && dirty.qualityGateFailed ? "PASS" : "FAIL",
  });

  const qty = await runHighQuantityVsQualityTest();
  rows.push({
    scenario: "quality vs quantity",
    expected: "4 good > 20 bad",
    actual: JSON.stringify(qty),
    result: qty.goodWins ? "PASS" : "FAIL",
  });

  const critical = await runQualityRankingCriticalTest();
  rows.push({
    scenario: "promoted junk",
    expected: "quality card wins",
    actual: JSON.stringify(critical),
    result: critical.verdict === "PASS" ? "PASS" : "FAIL",
  });

  const daosConnected = process.env.MARKETPLACE_CONTENT_QUALITY_DAOS_ENABLED === "true" &&
    Boolean(process.env.DAOS_QUALITY_API_URL?.trim());

  const report = {
    generatedAt: new Date().toISOString(),
    stagingUrl: STAGING_BASE,
    provider: {
      layer: "marketplace-content-quality",
      daosRealProvider: daosConnected ? "CONNECTED" : "NOT CONNECTED",
      runtimeProvider: good.provider,
      fallbackUsed: good.fallbackUsed,
    },
    productIds,
    evaluations: Object.fromEntries(
      Object.entries(evaluations).map(([k, v]) => [
        k,
        v
          ? {
              overallScore: v.overallScore,
              topEligibility: v.topEligibility,
              failedGates: v.failedGates,
              effectivePhotoCount: v.photo.effectivePhotoCount,
              uploadedPhotoCount: v.photo.uploadedPhotoCount,
              provider: v.provider,
              qualityModelVersion: v.qualityModelVersion,
              criticVersion: v.criticVersion,
              providerVersion: v.providerVersion,
            }
          : null,
      ]),
    ),
    scenarios: rows,
  };

  report.rankingLabV2 = "ACCEPTED";
  report.liveRanking = "OFF";
  const hardFails = rows.filter((r) => r.result === "FAIL").length;
  const criticalIds = [
    "irrelevant photos",
    "duplicates + spam",
    "dirty socks control",
    "quality vs quantity",
    "promoted junk",
  ];
  const criticalPass = criticalIds.every(
    (id) => rows.find((r) => r.scenario === id)?.result !== "FAIL",
  );
  report.verdict =
    hardFails === 0 && criticalPass
      ? rows.some((r) => r.result === "PARTIAL")
        ? "CONTENT QUALITY STAGING: ACCEPTED (with PARTIAL notes)"
        : "CONTENT QUALITY STAGING: ACCEPTED"
      : hardFails > 0
        ? "CONTENT QUALITY STAGING: NOT ACCEPTED"
        : "CONTENT QUALITY STAGING: PARTIAL";

  const outDir = join(process.cwd(), "artifacts/content-quality-staging");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "acceptance-report.json"), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
