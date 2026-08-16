import type { GraphEdge, GraphNode } from "./types";

export const CORE_CAUSAL_CHAIN: Array<Omit<GraphEdge, "id">> = [
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

export const TRUST_CHAIN: Array<Omit<GraphEdge, "id">> = [
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

export const PRICE_CHAIN: Array<Omit<GraphEdge, "id">> = [
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

export function materializeEdges(edges: Array<Omit<GraphEdge, "id">>): GraphEdge[] {
  return edges.map((e, i) => ({ ...e, id: `edge_${e.from}_${e.to}_${i}` }));
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
