import type { GraphEdge, GraphNode, GraphAppId } from "./types";
import { materializeEdges } from "./edges";

export function crossAppGraphExtensions(app: GraphAppId): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  if (app === "daos") {
    return {
      nodes: [
        { id: "daos_lighting", label: "Lighting", kind: "lighting", confidence: 0.7, app: "daos" },
        { id: "daos_contrast", label: "Contrast", kind: "contrast", confidence: 0.68, app: "daos" },
        { id: "daos_composition", label: "Composition", kind: "composition", confidence: 0.72, app: "daos" },
      ],
      edges: materializeEdges(
        [
          { from: "daos_lighting", to: "node_photo", relation: "causes", weight: 0.5, causal: true },
          { from: "daos_contrast", to: "node_ctr", relation: "influences", weight: 0.38, causal: true },
          { from: "daos_composition", to: "node_photo", relation: "causes", weight: 0.45, causal: true },
        ],
        { app: "daos" },
      ),
    };
  }

  if (app === "quicksale") {
    return {
      nodes: [
        {
          id: "qs_buyer_intent",
          label: "Buyer Intent",
          kind: "buyer_intent",
          confidence: 0.66,
          app: "quicksale",
        },
        {
          id: "qs_decision_maker",
          label: "Decision Maker",
          kind: "decision_maker",
          confidence: 0.62,
          app: "quicksale",
        },
        {
          id: "qs_industry",
          label: "Industry",
          kind: "industry",
          confidence: 0.6,
          app: "quicksale",
        },
      ],
      edges: materializeEdges(
        [
          { from: "qs_buyer_intent", to: "node_conversion", relation: "influences", weight: 0.42, causal: true },
          { from: "qs_decision_maker", to: "node_price", relation: "influences", weight: 0.35, causal: false },
        ],
        { app: "quicksale" },
      ),
    };
  }

  if (app === "marketplace") {
    return {
      nodes: [
        { id: "mp_orders", label: "Orders", kind: "conversion", confidence: 0.74, app: "marketplace" },
      ],
      edges: materializeEdges([
        { from: "node_conversion", to: "mp_orders", relation: "causes", weight: 0.6, causal: true },
        { from: "mp_orders", to: "node_revenue", relation: "causes", weight: 0.55, causal: true },
      ]),
    };
  }

  return { nodes: [], edges: [] };
}

export const CROSS_APP_GRAPH_APPS: GraphAppId[] = [
  "marketplace",
  "daos",
  "quicksale",
  "advertising",
  "search",
];
