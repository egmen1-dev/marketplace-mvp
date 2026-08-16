import type { BuildTwinSimulationInput, TwinAppId, TwinDecisionReport } from "./types";
import { runTwinSimulation } from "./simulation";

export async function runCrossAppTwinSimulation(
  app: TwinAppId,
  input: BuildTwinSimulationInput,
): Promise<TwinDecisionReport> {
  return runTwinSimulation({ ...input, app });
}

export const CROSS_APP_TWIN_APPS: TwinAppId[] = [
  "marketplace",
  "daos",
  "quicksale",
  "advertising",
  "search",
];
