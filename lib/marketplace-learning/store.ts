import type {
  ExperimentOutcome,
  KnowledgeBaseEntry,
  LearningExperiment,
  LearningPattern,
} from "./types";

type LearningStore = {
  experiments: Map<string, LearningExperiment>;
  outcomes: Map<string, ExperimentOutcome>;
  patterns: Map<string, LearningPattern>;
  knowledge: Map<string, KnowledgeBaseEntry>;
  seeded: boolean;
};

const globalForLearning = globalThis as typeof globalThis & {
  __marketplaceLearningStore?: LearningStore;
};

function createStore(): LearningStore {
  return {
    experiments: new Map(),
    outcomes: new Map(),
    patterns: new Map(),
    knowledge: new Map(),
    seeded: false,
  };
}

export function getLearningStore(): LearningStore {
  if (!globalForLearning.__marketplaceLearningStore) {
    globalForLearning.__marketplaceLearningStore = createStore();
  }
  return globalForLearning.__marketplaceLearningStore;
}

export function resetLearningStoreForTests(): void {
  globalForLearning.__marketplaceLearningStore = createStore();
}
