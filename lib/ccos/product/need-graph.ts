import type { NeedGraph, NeedGraphEdge, NeedGraphNode, ProductDNA, ProductIdentity } from "./types";

export function buildNeedGraph(identity: ProductIdentity, dna: ProductDNA): NeedGraph {
  const productLabel = identity.productType ?? identity.category ?? "товар";
  const rootProblem = dna.painPoints[0] ?? "дискомфорт";

  const nodes: NeedGraphNode[] = [
    { id: "problem", label: rootProblem, type: "problem" },
    { id: "need", label: dna.primaryNeed, type: "need" },
    { id: "product", label: productLabel, type: "product" },
  ];

  const edges: NeedGraphEdge[] = [
    { from: "problem", to: "need", relation: "causes" },
    { from: "need", to: "product", relation: "satisfies" },
  ];

  if (productLabel.toLowerCase().includes("вентилятор")) {
    nodes.push(
      { id: "alt_ac", label: "кондиционер", type: "solution" },
      { id: "alt_humid", label: "увлажнитель", type: "solution" },
    );
    edges.push(
      { from: "need", to: "alt_ac", relation: "alternative" },
      { from: "need", to: "alt_humid", relation: "alternative" },
    );
  }

  return { nodes, edges, rootProblemId: "problem" };
}
