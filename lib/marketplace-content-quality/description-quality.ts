import type { ProductQualityInput } from "./types";
import { clampScore, detectKeywordStuffing, extractVolumeLiters, tokenize } from "./utils";

export function evaluateDescriptionQuality(input: ProductQualityInput): {
  score: number;
  confidence: number;
  reasons: string[];
} {
  const hints = input.hints;
  if (hints?.descriptionQuality != null) {
    return {
      score: clampScore(hints.descriptionQuality),
      confidence: 0.92,
      reasons: ["Сценарий lab: задано descriptionQuality"],
    };
  }

  const desc = (input.description ?? "").trim();
  const reasons: string[] = [];
  let score = 55;
  let confidence = 0.72;

  if (desc.length === 0) {
    return { score: 8, confidence: 0.95, reasons: ["Описание отсутствует"] };
  }

  const nameTokens = tokenize(input.name);
  const descTokens = tokenize(desc);
  const relevance = nameTokens.length
    ? descTokens.filter((t) => nameTokens.includes(t)).length / nameTokens.length
    : 0.4;

  if (relevance >= 0.4) {
    score += 18;
    reasons.push("Описание связано с названием товара");
  } else {
    score -= 20;
    reasons.push("Описание слабо связано с названием");
    confidence -= 0.1;
  }

  if (desc.length >= 80 && desc.length <= 2500) {
    score += 12;
    reasons.push("Достаточный объём без перегруза");
  } else if (desc.length < 30) {
    score -= 18;
    reasons.push("Слишком короткое описание");
  } else if (desc.length > 4000) {
    score -= 10;
    reasons.push("Очень длинное описание — возможна «вода»");
  }

  if (detectKeywordStuffing(desc) || hints?.keywordStuffing) {
    score -= 35;
    reasons.push("Keyword stuffing в описании");
    confidence = 0.88;
  }

  const hasBenefits = /преимущ|особенност|подходит|использ|комплект/i.test(desc);
  if (hasBenefits) {
    score += 10;
    reasons.push("Раскрыты назначение или преимущества");
  }

  return { score: clampScore(score), confidence, reasons };
}

export function evaluateSeoQuality(input: ProductQualityInput): {
  score: number;
  confidence: number;
  reasons: string[];
  structuralCompleteness: number;
} {
  const hints = input.hints;
  if (hints?.seoQuality != null) {
    return {
      score: clampScore(hints.seoQuality),
      confidence: 0.9,
      reasons: ["Сценарий lab: задано seoQuality"],
      structuralCompleteness: clampScore(hints.seoQuality),
    };
  }

  const title = (input.seoTitle ?? input.name).trim();
  const meta = (input.seoDescription ?? "").trim();
  const reasons: string[] = [];
  let structural = 0;
  let quality = 45;

  if (title.length >= 12) structural += 35;
  if (meta.length >= 50) structural += 35;
  if (input.categoryId) structural += 15;
  if (input.characteristics.length >= 3) structural += 15;
  structural = clampScore(structural);

  const titleTokens = tokenize(title);
  const nameTokens = tokenize(input.name);
  if (overlapRatioLocal(titleTokens, nameTokens) >= 0.3) {
    quality += 20;
    reasons.push("SEO title релевантен товару");
  }

  const combined = `${title} ${meta}`;
  if (detectKeywordStuffing(combined) || hints?.keywordStuffing) {
    quality -= 40;
    reasons.push("Keyword stuffing в SEO");
  } else if (meta.length >= 50) {
    quality += 15;
    reasons.push("Meta description заполнено естественно");
  }

  if (title.length < 8) {
    quality -= 15;
    reasons.push("SEO title слишком короткий");
  }

  return {
    score: clampScore(Math.min(structural, quality)),
    confidence: 0.78,
    reasons,
    structuralCompleteness: structural,
  };
}

function overlapRatioLocal(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  return a.filter((t) => setB.has(t)).length / Math.max(1, a.length);
}

export function evaluateAttributesQuality(input: ProductQualityInput): {
  score: number;
  confidence: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  const count = input.characteristics.length;
  let score = count === 0 ? 15 : 40 + Math.min(45, count * 6);
  let confidence = 0.75;

  if (count >= 5) reasons.push("Характеристики заполнены полезно");
  if (count >= 15 && !input.categoryId) {
    score -= 10;
    reasons.push("Много полей без категории — подозрительно");
  }

  if (input.hints?.attributeConflict || input.hints?.volumeConflict) {
    score -= 30;
    reasons.push("Противоречие между характеристиками");
    confidence = 0.9;
  }

  const empty = input.characteristics.filter((c) => !c.value.trim()).length;
  if (empty > 0) {
    score -= empty * 5;
    reasons.push(`${empty} пустых характеристик`);
  }

  return { score: clampScore(score), confidence, reasons };
}

export function evaluateConsistency(input: ProductQualityInput): {
  score: number;
  confidence: number;
  reasons: string[];
  seriousContradiction: boolean;
} {
  const hints = input.hints;
  if (hints?.textImageConsistency != null) {
    return {
      score: clampScore(hints.textImageConsistency),
      confidence: 0.91,
      reasons: ["Сценарий lab: задано textImageConsistency"],
      seriousContradiction: hints.textImageConsistency < 25,
    };
  }

  const reasons: string[] = [];
  let score = 88;
  let seriousContradiction = false;

  const titleVol = extractVolumeLiters(input.name);
  const descVol = extractVolumeLiters(input.description ?? "");
  const attrVol = input.characteristics
    .map((c) => extractVolumeLiters(`${c.name} ${c.value}`))
    .find((v) => v != null);

  const volumes = [titleVol, descVol, attrVol].filter((v): v is number => v != null);
  if (volumes.length >= 2) {
    const min = Math.min(...volumes);
    const max = Math.max(...volumes);
    if (max - min >= 2) {
      score = 22;
      seriousContradiction = true;
      reasons.push(`Противоречие объёма: ${min}л vs ${max}л`);
    }
  }

  if (hints?.volumeConflict) {
    score = 18;
    seriousContradiction = true;
    reasons.push("Конфликт объёма между названием, описанием и характеристикой");
  }

  if (hints?.attributeConflict) {
    score = Math.min(score, 30);
    reasons.push("Противоречие между атрибутами");
  }

  return { score: clampScore(score), confidence: 0.86, reasons, seriousContradiction };
}

export function evaluateVideoQuality(input: ProductQualityInput): {
  score: number;
  confidence: number;
  reasons: string[];
} {
  if (!input.hasVideo) {
    return { score: 0, confidence: 0.95, reasons: ["Видео отсутствует"] };
  }

  const hints = input.hints;
  if (hints?.videoQuality != null) {
    return {
      score: clampScore(hints.videoQuality),
      confidence: 0.88,
      reasons:
        hints.videoShowsProduct === false
          ? ["Видео не показывает товар"]
          : ["Сценарий lab: задано videoQuality"],
    };
  }

  if (hints?.videoShowsProduct === false) {
    return { score: 4, confidence: 0.85, reasons: ["Видео не демонстрирует товар"] };
  }

  if (input.videoUrl) {
    return { score: 62, confidence: 0.55, reasons: ["Видео загружено — требуется vision-проверка"] };
  }

  return { score: 35, confidence: 0.5, reasons: ["Видео отмечено без URL — низкая уверенность"] };
}
