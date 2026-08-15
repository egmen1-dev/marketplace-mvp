import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

import { RANKING_LAB_DATASET_SIZE, RANKING_LAB_SEED } from "./types";

const CATEGORIES = [
  { id: "cat-tools", name: "Инструменты" },
  { id: "cat-electronics", name: "Электроника" },
  { id: "cat-home", name: "Дом и сад" },
  { id: "cat-fashion", name: "Одежда" },
  { id: "cat-sports", name: "Спорт" },
  { id: "cat-beauty", name: "Красота" },
  { id: "cat-auto", name: "Авто" },
  { id: "cat-kids", name: "Детские товары" },
  { id: "cat-food", name: "Продукты" },
  { id: "cat-garden", name: "Сад" },
] as const;

const PRODUCT_NAMES = [
  "Шуруповёрт",
  "Наушники",
  "Кофемашина",
  "Кроссовки",
  "Рюкзак",
  "Крем для лица",
  "Автомагнитола",
  "Конструктор",
  "Оливковое масло",
  "Садовый шланг",
  "Дрель",
  "Смарт-часы",
  "Пылесос",
  "Куртка",
  "Мяч футбольный",
];

function seeded(index: number, salt: number): number {
  const x = Math.sin((RANKING_LAB_SEED + index * 9973 + salt * 7919) * 0.0001) * 10000;
  return x - Math.floor(x);
}

function pick<T>(arr: readonly T[], index: number, salt: number): T {
  return arr[Math.floor(seeded(index, salt) * arr.length)]!;
}

function bucket(index: number, salt: number, levels: number): number {
  return Math.floor(seeded(index, salt) * levels);
}

/** Structured 1000-product marketplace — maximally diverse, deterministic. */
export function generateRankingLab1000Products(): RankingProductInput[] {
  return Array.from({ length: RANKING_LAB_DATASET_SIZE }, (_, i) => {
    const n = i + 1;
    const category = CATEGORIES[i % CATEGORIES.length]!;
    const baseName = pick(PRODUCT_NAMES, i, 1);
    const priceTier = bucket(i, 2, 12);
    const price = 490 + priceTier * 850 + (i % 7) * 37;
    const photoCount = bucket(i, 3, 9);
    const hasVideo = i % 11 === 0 || i % 17 === 0;
    const descriptionLength = 10 + bucket(i, 4, 18) * 12;
    const seoTitleLength = 6 + bucket(i, 5, 10) * 4;
    const seoDescriptionLength = 20 + bucket(i, 6, 12) * 10;
    const characteristicCount = bucket(i, 7, 11);
    const stock = i % 23 === 0 ? 0 : 1 + bucket(i, 8, 40);
    const views = 50 + bucket(i, 9, 50) * 25;
    const ctrBand = bucket(i, 10, 10);
    const favoritesCount = Math.round(views * (0.005 + ctrBand * 0.012));
    const convBand = bucket(i, 11, 10);
    const ordersCount = Math.max(0, Math.round(views * (0.002 + convBand * 0.009)));
    const trust = 35 + bucket(i, 12, 14) * 4 + (i % 3);
    const reviewsCount = bucket(i, 13, 60);
    const ratingBand = bucket(i, 14, 10);
    const sellerAverageRating = reviewsCount === 0 ? 0 : 3 + ratingBand * 0.2;
    const completedOrders = bucket(i, 15, 35);
    const promotionActive = i % 9 === 0;
    const returnsProxy = bucket(i, 16, 8);
    const isBadControl = i >= 980;
    const sellerId = `seller-lab-${Math.floor(i / 25)}`;

    let name = `${baseName} LAB-${String(n).padStart(4, "0")}`;
    let prohibitedHit = false;
    let moderationStatus: string | null = "APPROVED";
    let qualityScore: number | null = 55 + bucket(i, 17, 12) * 3;

    if (isBadControl) {
      const badType = i - 980;
      if (badType === 0) {
        name = "!!! SPAM SEO BUY CHEAP !!!";
        qualityScore = 15;
      } else if (badType === 1) {
        qualityScore = 10;
      } else if (badType === 2) {
        prohibitedHit = true;
      } else if (badType === 3) {
        moderationStatus = "REJECTED";
      } else if (badType === 4) {
        qualityScore = 5;
      } else if (badType === 5) {
        name = "x";
      } else if (badType === 6) {
        qualityScore = 8;
      } else if (badType === 7) {
        name = "Накрутка отзывов mega deal";
      } else if (badType === 8) {
        qualityScore = 12;
      } else if (badType === 9) {
        name = "!!! KEYWORD STUFF !!!";
      } else if (badType === 10) {
        qualityScore = 18;
      } else if (badType === 11) {
        prohibitedHit = true;
        qualityScore = 5;
      } else if (badType === 12) {
        name = "fake reviews bot";
      } else if (badType === 13) {
        qualityScore = 9;
      } else if (badType === 14) {
        moderationStatus = "REJECTED";
        qualityScore = 11;
      } else if (badType === 15) {
        name = "!!!";
      } else if (badType === 16) {
        qualityScore = 6;
      } else if (badType === 17) {
        prohibitedHit = true;
      } else if (badType === 18) {
        name = "SPAM SPAM SPAM";
      } else {
        qualityScore = 4;
      }
    }

    const photoCountFinal = isBadControl && i % 5 === 0 ? 0 : isBadControl && i % 7 === 0 ? 1 : photoCount;
    const descriptionFinal =
      isBadControl && i % 4 === 0 ? 5 : isBadControl && i % 6 === 0 ? 0 : descriptionLength;

    return {
      id: `LAB1000-${String(n).padStart(4, "0")}`,
      name,
      price,
      compareAt: i % 5 === 0 ? Math.round(price * 1.15) : null,
      status: stock === 0 && i % 23 === 0 ? "ACTIVE" : "ACTIVE",
      stock,
      views,
      favoritesCount,
      categoryId: category.id,
      categoryName: category.name,
      descriptionLength: descriptionFinal,
      seoTitleLength: isBadControl && i % 8 === 0 ? 3 : seoTitleLength,
      seoDescriptionLength: isBadControl && i % 9 === 0 ? 8 : seoDescriptionLength,
      photoCount: photoCountFinal,
      hasVideo: hasVideo && !isBadControl,
      characteristicCount,
      hasBrand: i % 4 !== 0,
      sellerId,
      sellerBlocked: false,
      sellerTrustScore: isBadControl ? Math.min(trust, 35) : trust,
      sellerReviewsCount: isBadControl && i % 3 === 0 ? 0 : reviewsCount,
      sellerAverageRating: isBadControl && i % 3 === 0 ? 0 : Math.min(5, sellerAverageRating),
      sellerCompletedOrders: completedOrders,
      sellerCancellationRate: 0.01 + returnsProxy * 0.008,
      moderationStatus,
      prohibitedHit,
      qualityScore,
      cartAdds: Math.round(favoritesCount * 0.6),
      ordersCount,
      promotionActive: promotionActive && !isBadControl,
    };
  });
}

export { CATEGORIES, RANKING_LAB_DATASET_SIZE };
