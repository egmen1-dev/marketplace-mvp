/** Minimal causal graph layer — bridge to Wave 4 Knowledge Graph */

export const KNOWLEDGE_GRAPH_CONTRACT_VERSION = "knowledge-graph-v1";

export type CausalNodeType = "observation" | "factor" | "outcome" | "action" | "need" | "product";

export interface CausalGraphNode {
  id: string;
  label: string;
  type: CausalNodeType;
  confidence: number;
}

export interface CausalGraphEdge {
  from: string;
  to: string;
  relation: "causes" | "influences" | "correlates" | "satisfies";
  weight: number;
  evidenceIds?: string[];
}

export interface CausalKnowledgeGraph {
  contractVersion: string;
  nodes: CausalGraphNode[];
  edges: CausalGraphEdge[];
  coverage: number;
  nodeCount: number;
  edgeCount: number;
}
