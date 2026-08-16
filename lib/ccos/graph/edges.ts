import type { GraphEdge, GraphNode, GraphEdgeDraft } from "./types";
import { GRAPH_ENGINE_VERSION } from "./types";

export const CORE_CAUSAL_CHAIN: GraphEdgeDraft[] = [
  {
    from: "node_photo",
    to: "node_ctr",
    relation: "causes",
    weight: 0.42,
    causal: true,
    sources: ["ranking-lab", "marketplace"],
  },
  {
    from: "node_ctr",
    to: "node_conversion",
    relation: "causes",
    weight: 0.31,
    causal: true,
    sources: ["marketplace"],
  },
  {
    from: "node_conversion",
    to: "node_revenue",
    relation: "causes",
    weight: 0.28,
    causal: true,
    sources: ["marketplace", "quicksale"],
  },
];

export const TRUST_CHAIN: GraphEdgeDraft[] = [
  {
    from: "node_review",
    to: "node_trust",
    relation: "causes",
    weight: 0.55,
    causal: true,
  },
  {
    from: "node_trust",
    to: "node_conversion",
    relation: "influences",
    weight: 0.38,
    causal: true,
  },
];

export const PRICE_CHAIN: GraphEdgeDraft[] = [
  {
    from: "node_price",
    to: "node_ctr",
    relation: "influences",
    weight: 0.35,
    causal: true,
  },
  {
    from: "node_price",
    to: "node_revenue",
    relation: "influences",
    weight: 0.4,
    causal: true,
  },
];

const DEFAULT_EDGE_CONFIDENCE = 0.72;

export function materializeEdges(
  edges: GraphEdgeDraft[],
  defaults?: Partial<Pick<GraphEdge, "confidence" | "version" | "app" | "verified">>,
): GraphEdge[] {
  const version = defaults?.version ?? GRAPH_ENGINE_VERSION;
  const app = defaults?.app ?? "marketplace";

  return edges.map((e, i) => ({
    confidence: DEFAULT_EDGE_CONFIDENCE,
    version,
    app,
    verified: true,
    sources: ["marketplace"],
    ...e,
    id: `edge_${e.from}_${e.to}_${i}`,
  }));
}

export function assertEdgeProvenance(edge: GraphEdge): boolean {
  return (
    Boolean(edge.from) &&
    Boolean(edge.to) &&
    typeof edge.weight === "number" &&
    typeof edge.confidence === "number" &&
    Boolean(edge.version) &&
    (edge.sources?.length ?? 0) > 0
  );
}

export function coreGraphNodes(): GraphNode[] {
  return [
    { id: "node_photo", label: "Фото", kind: "photo", confidence: 0.75 },
    { id: "node_price", label: "Цена", kind: "price", confidence: 0.7 },
    { id: "node_video", label: "Видео", kind: "video", confidence: 0.65 },
    { id: "node_seo", label: "SEO", kind: "seo", confidence: 0.68 },
    { id: "node_review", label: "Отзывы", kind: "review", confidence: 0.72 },
    { id: "node_trust", label: "Доверие", kind: "trust", confidence: 0.7 },
    { id: "node_promotion", label: "Продвижение", kind: "promotion", confidence: 0.6 },
    { id: "node_ctr", label: "CTR", kind: "ctr", confidence: 0.8 },
    { id: "node_conversion", label: "Конверсия", kind: "conversion", confidence: 0.78 },
    { id: "node_revenue", label: "Revenue", kind: "revenue", confidence: 0.75 },
  ];
}
