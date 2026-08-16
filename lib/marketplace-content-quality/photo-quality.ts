import type { ImageQualityEvaluation, ProductImageInput, ProductQualityInput } from "./types";
import { clampScore, overlapRatio, tokenize } from "./utils";

const UNRELATED_OBJECT_TOKENS = [
  "носок",
  "носки",
  "sock",
  "socks",
  "чайник",
  "kettle",
  "обувь",
  "shoe",
  "shoes",
];

function altContradictsProduct(name: string, alt: string): boolean {
  const nameTokens = tokenize(name);
  const altTokens = tokenize(alt);
  if (nameTokens.length === 0 || altTokens.length === 0) return false;
  if (overlapRatio(nameTokens, altTokens) >= 0.2) return false;
  return altTokens.some((t) =>
    UNRELATED_OBJECT_TOKENS.some((u) => t.includes(u) || u.includes(t)),
  );
}

function identityToken(img: ProductImageInput): string {
  const alt = (img.alt ?? "").toLowerCase();
  if (alt.trim()) return alt.trim();
  return (img.pathname ?? img.url).toLowerCase();
}

function imagesShowProductFamily(name: string, images: ProductImageInput[]): boolean {
  const nameTokens = tokenize(name);
  if (nameTokens.length === 0) return true;
  const aligned = images.filter(
    (img) => overlapRatio(nameTokens, tokenize(img.alt ?? "")) >= 0.15,
  ).length;
  return aligned >= Math.ceil(images.length * 0.5);
}

export type PhotoQualityBundle = {
  photo: {
    score: number;
    confidence: number;
    uploadedPhotoCount: number;
    effectivePhotoCount: number;
    reasons: string[];
    images: ImageQualityEvaluation[];
  };
  thumbnail: { score: number; confidence: number; reasons: string[] };
  primary: { score: number; confidence: number; reasons: string[] };
  commercialVisibility: { score: number; confidence: number; reasons: string[] };
  composition: { score: number; confidence: number; reasons: string[] };
  background: { score: number; confidence: number; reasons: string[] };
  lighting: { score: number; confidence: number; reasons: string[] };
  readability: { score: number; confidence: number; reasons: string[] };
  relevance: { score: number; confidence: number; reasons: string[]; irrelevant: boolean };
  identity: { score: number; confidence: number; reasons: string[]; mismatch: boolean };
};

function dedupeKey(img: ProductImageInput): string {
  try {
    const u = new URL(img.url);
    return `${u.origin}${u.pathname}`.toLowerCase();
  } catch {
    return (img.pathname ?? img.url).toLowerCase();
  }
}

function estimatePerImageScore(
  img: ProductImageInput,
  index: number,
  productName: string,
  nameTokens: string[],
  hints: ProductQualityInput["hints"],
): ImageQualityEvaluation {
  const altTokens = tokenize(img.alt ?? "");
  const altOverlap = nameTokens.length
    ? altTokens.filter((t) => nameTokens.includes(t)).length / nameTokens.length
    : 0.3;

  let relevance = clampScore(35 + altOverlap * 55);
  if (hints?.photoRelevance != null) {
    relevance = hints.photoRelevance;
  } else if (hints?.allPhotosIrrelevant || hints?.irrelevantPhotos) {
    relevance = 0;
  } else if (altContradictsProduct(productName, img.alt ?? "")) {
    relevance = clampScore(4 + index);
  }

  let technical = hints?.primaryPhotoQuality ?? clampScore(55 + (img.isPrimary ? 15 : 8));
  if (img.isPrimary && hints?.primaryPhotoQuality != null) {
    technical = hints.primaryPhotoQuality;
  }

  const score = clampScore(relevance * 0.55 + technical * 0.45);
  const tags: string[] = [];
  if (relevance < 25) tags.push("irrelevant");
  if (img.isPrimary) tags.push("primary");
  if (score >= 80) tags.push("strong");

  const reasons: string[] = [];
  if (relevance < 30) {
    reasons.push(
      relevance <= 8
        ? "Не соответствует заявленному товару"
        : "Изображение слабо связано с товаром",
    );
  }
  if (technical < 45) reasons.push("Техническое качество ниже нормы");
  if (score >= 75) reasons.push("Фото полезно покупателю");

  return {
    imageId: img.id,
    index: index + 1,
    url: img.url,
    score,
    relevance: clampScore(relevance),
    confidence: hints?.photoRelevance != null ? 0.93 : 0.68,
    isPrimary: img.isPrimary,
    tags,
    evidence: { reasons, imageIndex: index + 1, imageUrl: img.url },
  };
}

export function evaluatePhotoQuality(input: ProductQualityInput): PhotoQualityBundle {
  const hints = input.hints;
  const images = [...input.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const uploadedPhotoCount = images.length;
  const nameTokens = tokenize(input.name);

  const uniqueKeys = new Set(images.map(dedupeKey));
  const duplicateRatio =
    hints?.duplicateRatio ??
    (uploadedPhotoCount > 0 ? 1 - uniqueKeys.size / uploadedPhotoCount : 0);
  const effectivePhotoCount =
    hints?.effectivePhotoCount ??
    Math.max(1, Math.round(uploadedPhotoCount * (1 - duplicateRatio)));

  const imageEvaluations = images.map((img, i) =>
    estimatePerImageScore(img, i, input.name, nameTokens, hints),
  );

  const avgRelevance =
    imageEvaluations.length === 0
      ? 0
      : imageEvaluations.reduce((s, e) => s + e.relevance, 0) / imageEvaluations.length;
  const avgTechnical =
    imageEvaluations.length === 0
      ? 0
      : imageEvaluations.reduce((s, e) => s + e.score, 0) / imageEvaluations.length;

  const diversityBonus = effectivePhotoCount >= 3 ? 8 : effectivePhotoCount >= 2 ? 4 : 0;
  const duplicatePenalty = duplicateRatio > 0.5 ? 25 : duplicateRatio > 0.2 ? 12 : 0;

  let photoScore = clampScore(avgTechnical - duplicatePenalty + diversityBonus);
  if (uploadedPhotoCount === 0) photoScore = 0;

  const primaryImg = imageEvaluations.find((e) => e.isPrimary) ?? imageEvaluations[0];
  const primaryScore = primaryImg?.score ?? 0;

  const thumbnailScore = clampScore(
    hints?.thumbnailQuality ??
      (primaryImg ? primaryImg.score * 0.85 + (primaryImg.relevance >= 50 ? 10 : -15) : 0),
  );

  const commercialVisibility = clampScore(
    hints?.commercialVisibility ?? thumbnailScore * 0.6 + primaryScore * 0.4,
  );
  const composition = clampScore(hints?.compositionScore ?? primaryScore * 0.9);
  const background = clampScore(hints?.backgroundScore ?? primaryScore * 0.85);
  const lighting = clampScore(hints?.lightingScore ?? primaryScore * 0.88);
  const readability = clampScore(hints?.readabilityScore ?? 70);

  const contradictoryImages = images.filter((img) =>
    altContradictsProduct(input.name, img.alt ?? ""),
  ).length;
  const identityMismatchFromAlts =
    contradictoryImages >= 2 ||
    (contradictoryImages >= 1 && !imagesShowProductFamily(input.name, images));

  const irrelevant =
    hints?.allPhotosIrrelevant === true ||
    hints?.irrelevantPhotos === true ||
    avgRelevance < 20 ||
    imageEvaluations.filter((e) => e.relevance < 25).length >= Math.ceil(uploadedPhotoCount * 0.6);
  const relevanceScore = irrelevant ? clampScore(avgRelevance * 0.3) : clampScore(avgRelevance);

  const identityMismatch =
    hints?.productIdentityMismatch === true || identityMismatchFromAlts;
  const identityScore = clampScore(
    hints?.productIdentityScore ?? (identityMismatch ? 8 : Math.max(relevanceScore, 55)),
  );

  const photoReasons: string[] = [];
  if (uploadedPhotoCount === 0) photoReasons.push("Нет фотографий");
  if (duplicatePenalty > 0) {
    photoReasons.push(
      `effectivePhotoCount=${effectivePhotoCount} из ${uploadedPhotoCount} (дубликаты)`,
    );
  }
  if (irrelevant) photoReasons.push("Большинство фото не соответствует товару");
  if (photoScore >= 75) photoReasons.push("Набор фото полезен покупателю");

  const relevanceReasons: string[] = [];
  if (irrelevant) {
    relevanceReasons.push("Photo relevance ниже порога");
    const bad = imageEvaluations.filter((e) => e.relevance < 30);
    if (bad.length) {
      relevanceReasons.push(`${bad.length} из ${uploadedPhotoCount} изображений нерелевантны`);
    }
  } else {
    relevanceReasons.push("Фото в целом соответствуют товару");
  }

  return {
    photo: {
      score: photoScore,
      confidence: hints?.photoRelevance != null ? 0.94 : 0.71,
      uploadedPhotoCount,
      effectivePhotoCount,
      reasons: photoReasons,
      images: imageEvaluations,
    },
    thumbnail: {
      score: thumbnailScore,
      confidence: hints?.thumbnailQuality != null ? 0.9 : 0.7,
      reasons: thumbnailScore < 50 ? ["Товар плохо читается в маленьком размере"] : ["Thumbnail читается"],
    },
    primary: {
      score: primaryScore,
      confidence: 0.74,
      reasons:
        primaryScore < 45
          ? ["Главное фото не показывает товар достаточно крупно"]
          : ["Главное фото понятно"],
    },
    commercialVisibility: {
      score: commercialVisibility,
      confidence: 0.72,
      reasons:
        commercialVisibility >= 70
          ? ["Карточка заметна в коммерческой выдаче"]
          : ["Коммерческая заметность ниже нормы"],
    },
    composition: { score: composition, confidence: 0.65, reasons: [] },
    background: { score: background, confidence: 0.65, reasons: [] },
    lighting: { score: lighting, confidence: 0.65, reasons: [] },
    readability: { score: readability, confidence: 0.6, reasons: [] },
    relevance: {
      score: relevanceScore,
      confidence: irrelevant ? 0.92 : 0.75,
      reasons: relevanceReasons,
      irrelevant,
    },
    identity: {
      score: identityScore,
      confidence: identityMismatch ? 0.93 : 0.7,
      reasons: identityMismatch
        ? ["На фото разные товары — product identity mismatch"]
        : ["Фото показывают один товар"],
      mismatch: identityMismatch,
    },
  };
}
