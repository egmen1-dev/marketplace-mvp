import type { RankingSimulationPort } from "./types";

const ports = new Map<string, RankingSimulationPort>();

export function registerSimulationPort(port: RankingSimulationPort): RankingSimulationPort {
  ports.set(port.id, port);
  return port;
}

export function getSimulationPort(id: string): RankingSimulationPort | null {
  return ports.get(id) ?? null;
}

export function listSimulationPorts(): RankingSimulationPort[] {
  return [...ports.values()];
}

export function resetSimulationPortRegistry(): void {
  ports.clear();
}

export function requireSimulationPort(id: string): RankingSimulationPort {
  const port = getSimulationPort(id);
  if (!port) {
    throw new Error(`Simulation port not registered: ${id}`);
  }
  return port;
}
