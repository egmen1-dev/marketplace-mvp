import type { RankingSimulationPort, RankingSimulationInput, RankingSimulationResult } from "./types";
import { DEFAULT_SIMULATION_TIMEOUT_MS } from "./types";

export async function evaluateSimulationWithTimeout(
  port: RankingSimulationPort,
  input: RankingSimulationInput,
  timeoutMs = DEFAULT_SIMULATION_TIMEOUT_MS,
): Promise<RankingSimulationResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const result = await Promise.race([
      port.evaluate(input),
      new Promise<RankingSimulationResult>((_, reject) => {
        timer = setTimeout(() => reject(new Error("SIMULATION_TIMEOUT")), timeoutMs);
      }),
    ]);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes("SIMULATION_TIMEOUT");
    return {
      status: isTimeout ? "TIMEOUT" : "ERROR",
      failedPort: port.id,
      failureReason: message,
      retryable: isTimeout,
      estimatedPosition: null,
      relativeScore: null,
      factors: [],
      confidence: 0,
      source: {
        app: port.app,
        module: "simulation-port",
        version: port.version,
        portId: port.id,
      },
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
