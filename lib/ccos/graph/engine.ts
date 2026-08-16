import type { GraphEdge, GraphNode } from "./types";

export class UniversalGraphEngine {
  private nodes = new Map<string, GraphNode>();
  private edges: GraphEdge[] = [];

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: GraphEdge): void {
    this.edges.push(edge);
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  listNodes(): GraphNode[] {
    return [...this.nodes.values()];
  }

  listEdges(): GraphEdge[] {
    return [...this.edges];
  }

  outgoing(nodeId: string, causalOnly = false): GraphEdge[] {
    return this.edges.filter(
      (e) => e.from === nodeId && (!causalOnly || e.causal || e.relation === "causes"),
    );
  }

  incoming(nodeId: string, causalOnly = false): GraphEdge[] {
    return this.edges.filter(
      (e) => e.to === nodeId && (!causalOnly || e.causal || e.relation === "causes"),
    );
  }

  snapshot(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return { nodes: this.listNodes(), edges: [...this.edges] };
  }

  reset(): void {
    this.nodes.clear();
    this.edges = [];
  }
}

let sharedEngine: UniversalGraphEngine | null = null;

export function getGraphEngine(): UniversalGraphEngine {
  if (!sharedEngine) sharedEngine = new UniversalGraphEngine();
  return sharedEngine;
}

export function resetGraphEngine(): void {
  if (sharedEngine) sharedEngine.reset();
  sharedEngine = null;
}
