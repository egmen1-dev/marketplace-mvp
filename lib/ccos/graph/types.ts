/** CCOS Wave 4 — Cognitive Knowledge Graph Platform */

export const KNOWLEDGE_GRAPH_CONTRACT_VERSION = "knowledge-graph-v1";
export const GRAPH_ENGINE_VERSION = "graph-engine-v1";

export type GraphNodeKind =
  | "product"
  | "seller"
  | "buyer"
  | "photo"
  | "price"
  | "ctr"
  | "conversion"
  | "revenue"
  | "review"
  | "trust"
  | "promotion"
  | "category"
  | "need"
  | "query"
  | "season"
  | "video"
  | "seo"
  | "lighting"
  | "contrast"
  | "composition"
  | "buyer_intent"
  | "decision_maker"
  | "industry"
  | "factor"
  | "outcome"
  | "observation"
  | "action";

/** @deprecated alias — use GraphNodeKind */
export type CausalNodeType = GraphNodeKind;

export type GraphEdgeRelation = "causes" | "influences" | "correlates" | "satisfies" | "blocks";

export type GraphPackId = "fans" | "flowers" | "electronics" | "garden" | "construction" | "generic";

export type GraphAppId = "marketplace" | "daos" | "quicksale" | "advertising" | "search";

export interface GraphNode {
  id: string;
  label: string;
  kind: GraphNodeKind;
  confidence: number;
  packId?: GraphPackId;
  app?: GraphAppId;
  factId?: string;
  evidenceIds?: string[];
}

/** @deprecated alias — use GraphNode */
export type CausalGraphNode = GraphNode;

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  relation: GraphEdgeRelation;
  weight: number;
  causal: boolean;
  evidenceIds?: string[];
  sources?: string[];
}

/** @deprecated alias — use GraphEdge */
export type CausalGraphEdge = GraphEdge;

export interface GraphHealth {
  coverage: number;
  density: number;
  connectedComponents: number;
  averageConfidence: number;
  nodeCount: number;
  edgeCount: number;
  label: "strong" | "moderate" | "sparse";
}

export interface GraphVersionSnapshot {
  version: string;
  contractVersion: string;
  createdAt: string;
  nodeCount: number;
  edgeCount: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CausalKnowledgeGraph {
  contractVersion: string;
  version: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  coverage: number;
  nodeCount: number;
  edgeCount: number;
  health: GraphHealth;
  propagatedConfidence: number;
  packId?: GraphPackId;
}

export interface GraphWhyPath {
  question: string;
  rootCauseId: string;
  path: Array<{ nodeId: string; label: string; kind: GraphNodeKind; weight?: number }>;
  confidence: number;
  explanation: string;
}

export interface GraphCounterfactual {
  question: string;
  baselineAction: string;
  alternativeAction: string;
  predictedOutcome: string;
  confidence: number;
  path: GraphWhyPath["path"];
  advisoryOnly: true;
}

export interface AggregatedGraphEvidence {
  claim: string;
  confidence: number;
  evidenceIds: string[];
  sources: string[];
  factIds: string[];
}

export interface MobileGraphInsights {
  productId: string;
  primaryCause: string;
  topFactors: Array<{ label: string; influence: number; kind: GraphNodeKind }>;
  recommendedAction: string;
  confidence: number;
  confidenceLabel: "high" | "medium" | "low";
  whyPath: GraphWhyPath;
  advisoryOnly: true;
}

export interface GraphCacheEntry {
  productId: string;
  graph: CausalKnowledgeGraph;
  insights: MobileGraphInsights;
  cachedAt: string;
  syncVersion: string;
}

export type BuildKnowledgeGraphInput = {
  productId?: string;
  productUnderstanding?: import("@/lib/ccos/product").ProductUnderstanding | null;
  verifiedFacts?: import("@/lib/ccos/knowledge/types").KnowledgeFact[];
  observations?: import("@/lib/ccos/observation/types").UniversalObservation[];
  packId?: GraphPackId;
  categorySlug?: string | null;
  weakSignals?: Array<{ metric: string; score: number | null; label: string }>;
};
