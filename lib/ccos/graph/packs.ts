import type { GraphEdge, GraphNode, GraphPackId, GraphEdgeDraft } from "./types";
import { materializeEdges } from "./edges";

const PACK_SUBGRAPHS: Record<
  GraphPackId,
  { nodes: GraphNode[]; edges: GraphEdgeDraft[] }
> = {
  fans: {
    nodes: [
      { id: "pack_fans_noise", label: "Уровень шума", kind: "factor", confidence: 0.7, packId: "fans" },
      { id: "pack_fans_power", label: "Мощность", kind: "factor", confidence: 0.72, packId: "fans" },
    ],
    edges: [
      { from: "pack_fans_noise", to: "node_conversion", relation: "influences", weight: 0.45, causal: true },
      { from: "node_photo", to: "pack_fans_power", relation: "influences", weight: 0.35, causal: false },
    ],
  },
  flowers: {
    nodes: [
      { id: "pack_flowers_fresh", label: "Свежесть", kind: "factor", confidence: 0.8, packId: "flowers" },
    ],
    edges: [
      { from: "pack_flowers_fresh", to: "node_trust", relation: "causes", weight: 0.5, causal: true },
      { from: "node_photo", to: "pack_flowers_fresh", relation: "causes", weight: 0.55, causal: true },
    ],
  },
  electronics: {
    nodes: [
      { id: "pack_elec_specs", label: "Характеристики", kind: "factor", confidence: 0.74, packId: "electronics" },
    ],
    edges: [
      { from: "pack_elec_specs", to: "node_conversion", relation: "influences", weight: 0.48, causal: true },
    ],
  },
  garden: {
    nodes: [
      { id: "pack_garden_season", label: "Сезонность", kind: "season", confidence: 0.65, packId: "garden" },
    ],
    edges: [
      { from: "pack_garden_season", to: "node_ctr", relation: "influences", weight: 0.4, causal: true },
    ],
  },
  construction: {
    nodes: [
      { id: "pack_const_cert", label: "Сертификаты", kind: "factor", confidence: 0.77, packId: "construction" },
    ],
    edges: [
      { from: "pack_const_cert", to: "node_trust", relation: "causes", weight: 0.58, causal: true },
    ],
  },
  generic: {
    nodes: [],
    edges: [],
  },
};

export function resolveGraphPackId(input: {
  categorySlug?: string | null;
  productType?: string | null;
}): GraphPackId {
  const t = `${input.categorySlug ?? ""} ${input.productType ?? ""}`.toLowerCase();
  if (t.includes("fan") || t.includes("вентил")) return "fans";
  if (t.includes("flower") || t.includes("цвет")) return "flowers";
  if (t.includes("elect") || t.includes("phone")) return "electronics";
  if (t.includes("garden") || t.includes("сад")) return "garden";
  if (t.includes("construct") || t.includes("стро")) return "construction";
  return "generic";
}

export function getPackSubgraph(packId: GraphPackId): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const pack = PACK_SUBGRAPHS[packId] ?? PACK_SUBGRAPHS.generic;
  return { nodes: pack.nodes, edges: materializeEdges(pack.edges) };
}
