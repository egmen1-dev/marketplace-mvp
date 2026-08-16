import type { ProductQualityInput } from "../types";

export const DIRTY_SOCKS_SCENARIO_ID = "dirty-socks-product-control";

export function buildDirtySocksProductControl(): ProductQualityInput {
  const images = Array.from({ length: 10 }, (_, i) => ({
    id: `sock-${i + 1}`,
    url: `https://example.com/socks/${i + 1}.jpg`,
    alt: "dirty socks",
    sortOrder: i,
    isPrimary: i === 0,
    pathname: `socks/${i + 1}.jpg`,
  }));

  return {
    productId: "dirty-socks-control",
    name: "Напольный вентилятор",
    description:
      "Мощный напольный вентилятор с тихим двигателем, три скорости, устойчивое основание. Идеален для дома и офиса.",
    seoTitle: "Напольный вентилятор купить — тихий, мощный, с доставкой",
    seoDescription:
      "Напольный вентилятор с регулировкой скорости. Подходит для гостиной и спальни. Быстрая доставка.",
    categoryId: "cat-home",
    categoryName: "Климатическая техника",
    images,
    characteristics: Array.from({ length: 12 }, (_, i) => ({
      name: `Характеристика ${i + 1}`,
      slug: `attr-${i + 1}`,
      value: `Значение ${i + 1}`,
    })),
    hasVideo: false,
    moderationStatus: "APPROVED",
    prohibitedHit: false,
    hints: {
      scenarioId: DIRTY_SOCKS_SCENARIO_ID,
      allPhotosIrrelevant: true,
      irrelevantPhotos: true,
      photoRelevance: 0,
      productIdentityMismatch: true,
      productIdentityScore: 5,
      primaryPhotoQuality: 8,
      thumbnailQuality: 6,
      descriptionQuality: 95,
      seoQuality: 98,
      buyerValue: 90,
      commercialIntent: 88,
    },
  };
}

export function buildHighQuantityLowQualityProduct(): ProductQualityInput {
  const images = Array.from({ length: 20 }, (_, i) => ({
    id: `bad-${i + 1}`,
    url: `https://example.com/bad/${i + 1}.jpg`,
    alt: "low quality",
    sortOrder: i,
    isPrimary: i === 0,
    pathname: "bad/same.jpg",
  }));

  return {
    productId: "hq-lq-20-photos",
    name: "Блендер кухонный PRO",
    description: "Блендер для смузи и коктейлей.",
    categoryId: "cat-home",
    categoryName: "Кухня",
    images,
    characteristics: [
      { name: "Мощность", slug: "power", value: "800 Вт" },
      { name: "Объём", slug: "volume", value: "1.5 л" },
    ],
    hasVideo: false,
    hints: {
      scenarioId: "high-quantity-low-quality",
      duplicateRatio: 0.95,
      effectivePhotoCount: 1,
      photoRelevance: 35,
      primaryPhotoQuality: 22,
      thumbnailQuality: 18,
    },
  };
}

export function buildFourQualityPhotosProduct(): ProductQualityInput {
  const images = Array.from({ length: 4 }, (_, i) => ({
    id: `good-${i + 1}`,
    url: `https://example.com/blender/${i + 1}.jpg`,
    alt: "блендер кухонный",
    sortOrder: i,
    isPrimary: i === 0,
    pathname: `blender/angle-${i + 1}.jpg`,
  }));

  return {
    productId: "four-quality-photos",
    name: "Блендер кухонный PRO",
    description: "Блендер для смузи и коктейлей с нержавеющими ножами.",
    categoryId: "cat-home",
    categoryName: "Кухня",
    images,
    characteristics: [
      { name: "Мощность", slug: "power", value: "800 Вт" },
      { name: "Объём", slug: "volume", value: "1.5 л" },
    ],
    hasVideo: false,
    hints: {
      scenarioId: "four-quality-photos",
      photoRelevance: 92,
      primaryPhotoQuality: 90,
      thumbnailQuality: 88,
      effectivePhotoCount: 4,
      duplicateRatio: 0,
      descriptionQuality: 82,
    },
  };
}

export function buildDescriptionSpamProduct(): ProductQualityInput {
  const spam = Array.from({ length: 40 }, () => "вентилятор купить дешево москва").join(" ");
  return {
    productId: "description-spam",
    name: "Напольный вентилятор",
    description: spam,
    seoTitle: "вентилятор купить вентилятор дешево вентилятор москва",
    seoDescription: spam.slice(0, 500),
    categoryId: "cat-home",
    categoryName: "Климат",
    images: [
      {
        id: "fan-1",
        url: "https://example.com/fan/1.jpg",
        alt: "вентилятор",
        sortOrder: 0,
        isPrimary: true,
      },
    ],
    characteristics: [{ name: "Мощность", slug: "power", value: "45 W" }],
    hasVideo: false,
    hints: { keywordStuffing: true, seoQuality: 15, descriptionQuality: 18 },
  };
}

export function buildVideoJunkProduct(): ProductQualityInput {
  return {
    productId: "video-junk",
    name: "Пылесос вертикальный",
    description: "Мощный вертикальный пылесос.",
    categoryId: "cat-home",
    categoryName: "Бытовая техника",
    images: [
      {
        id: "vac-1",
        url: "https://example.com/vac/1.jpg",
        alt: "пылесос",
        sortOrder: 0,
        isPrimary: true,
      },
    ],
    characteristics: [{ name: "Мощность", slug: "power", value: "200 W" }],
    hasVideo: true,
    videoUrl: "https://example.com/unrelated.mp4",
    hints: { videoQuality: 2, videoShowsProduct: false },
  };
}

export function buildContradictoryAttributesProduct(): ProductQualityInput {
  return {
    productId: "volume-conflict",
    name: "Опрыскиватель 16 л",
    description: "Опрыскиватель объёмом 16 литров для сада.",
    categoryId: "cat-garden",
    categoryName: "Сад",
    images: [
      {
        id: "spray-1",
        url: "https://example.com/spray/1.jpg",
        alt: "опрыскиватель",
        sortOrder: 0,
        isPrimary: true,
      },
    ],
    characteristics: [{ name: "Объём", slug: "volume", value: "12 л" }],
    hasVideo: false,
    hints: { volumeConflict: { title: "16", description: "16", attribute: "12" }, attributeConflict: true },
  };
}

export function buildDuplicatePhotoProduct(): ProductQualityInput {
  const images = Array.from({ length: 10 }, (_, i) => ({
    id: `dup-${i + 1}`,
    url: "https://example.com/same.jpg",
    alt: "same",
    sortOrder: i,
    isPrimary: i === 0,
    pathname: "products/same.jpg",
  }));
  return {
    productId: "duplicate-photos",
    name: "Фонарь кемпинговый",
    description: "Яркий кемпинговый фонарь.",
    categoryId: "cat-sports",
    categoryName: "Туризм",
    images,
    characteristics: [{ name: "Яркость", slug: "lumens", value: "800 lm" }],
    hasVideo: false,
    hints: { duplicateRatio: 0.9, effectivePhotoCount: 1, photoRelevance: 70, primaryPhotoQuality: 65 },
  };
}

export const CONTENT_QUALITY_BENCHMARK_SCENARIOS = [
  buildDirtySocksProductControl,
  buildHighQuantityLowQualityProduct,
  buildFourQualityPhotosProduct,
  buildDescriptionSpamProduct,
  buildVideoJunkProduct,
  buildContradictoryAttributesProduct,
  buildDuplicatePhotoProduct,
] as const;
