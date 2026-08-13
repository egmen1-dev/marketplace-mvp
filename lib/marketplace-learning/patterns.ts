import { getLearningStore } from "./store";
import type { ExperimentOutcome, LearningExperiment, LearningPattern } from "./types";

const SEED_PATTERNS: Omit<LearningPattern, "id" | "createdAt">[] = [
  {
    statement: "Товары с 5+ фото продаются лучше",
    confidence: 87,
    sampleSize: 430,
    category: null,
    sources: ["QUALITY_SCORE", "GROWTH_SCORE"],
  },
  {
    statement:
      "Заполненные характеристики увеличивают добавления в корзину",
    confidence: 74,
    sampleSize: 312,
    category: null,
    sources: ["EDUCATION_COACH", "QUALITY_SCORE"],
  },
  {
    statement: "Высокий trust score коррелирует с большим числом заказов",
    confidence: 68,
    sampleSize: 198,
    category: null,
    sources: ["TRUST_COACH"],
  },
  {
    statement: "Продвижение эффективнее в категориях с высоким спросом",
    confidence: 61,
    sampleSize: 96,
    category: "electronics",
    sources: ["PROMOTION_OPPORTUNITY"],
  },
];

export function seedDefaultPatterns(): void {
  const store = getLearningStore();
  if (store.seeded) return;
  for (const pattern of SEED_PATTERNS) {
    const id = `pattern_seed_${pattern.statement.slice(0, 12).replace(/\s/g, "_")}`;
    store.patterns.set(id, {
      ...pattern,
      id,
      createdAt: new Date().toISOString(),
    });
  }
  store.seeded = true;
}

export function patternFromOutcome(input: {
  experiment: LearningExperiment;
  outcome: ExperimentOutcome;
}): LearningPattern | null {
  if (input.outcome.verdict !== "POSITIVE") return null;

  const statement = `«${input.experiment.recommendation}» дало положительный эффект для ${input.experiment.entityType.toLowerCase()}`;
  const id = `pattern_${input.experiment.id}`;

  const pattern: LearningPattern = {
    id,
    statement,
    confidence: 72,
    sampleSize: 1,
    category: null,
    sources: [input.experiment.source],
    createdAt: new Date().toISOString(),
  };

  getLearningStore().patterns.set(id, pattern);
  return pattern;
}

export function upsertPattern(pattern: LearningPattern): void {
  getLearningStore().patterns.set(pattern.id, pattern);
}

export function listPatterns(limit = 20): LearningPattern[] {
  seedDefaultPatterns();
  return [...getLearningStore().patterns.values()]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

export function patternsForSeller(): LearningPattern[] {
  return listPatterns(6);
}

export function registerPatternFromExperiment(input: {
  experiment: LearningExperiment;
  outcome: ExperimentOutcome;
}): LearningPattern | null {
  return patternFromOutcome(input);
}
