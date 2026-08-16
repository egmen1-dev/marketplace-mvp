/** Shared scenario contract — no module cycles between twin and simulation ports */

export type ScenarioActionType =
  | "replace_first_photo"
  | "add_video"
  | "change_price"
  | "change_seo"
  | "enable_promotion"
  | "improve_description"
  | "reorder_photos"
  | "combined";

export interface ScenarioAction {
  type: ScenarioActionType;
  params?: Record<string, number | boolean | string>;
}

export interface SimulationScenario {
  id: string;
  label: string;
  actions: ScenarioAction[];
  type: ScenarioActionType;
}

export const BASELINE_SIMULATION_SCENARIO: SimulationScenario = {
  id: "baseline",
  label: "Baseline",
  type: "combined",
  actions: [],
};
