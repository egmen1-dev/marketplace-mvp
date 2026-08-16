/** @deprecated — use repository.ts and hypothesis.ts */
export {
  getKnowledgeRepository as getKnowledgeStore,
  setKnowledgeRepository as setKnowledgeStore,
  resetKnowledgeRepository as resetKnowledgeStore,
  InMemoryKnowledgeRepository as InMemoryKnowledgeStore,
  type KnowledgeRepository as KnowledgeStore,
} from "./repository";
export { createEvidence } from "./evidence";
export { createHypothesis, proposeHypothesis } from "./hypothesis";
