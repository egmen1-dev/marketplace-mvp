export type ContextualInterpretation =
  | "strong_positive"
  | "positive"
  | "neutral"
  | "negative"
  | "strong_negative";

export interface ContextualSignal {
  observationId: string;
  contextId: string;
  domain: string;
  metric: string;
  interpretation: ContextualInterpretation;
  relativeScore?: number;
  confidence: number;
  explanation: string;
}

export const INTERPRETER_VERSION = "interpreter-v1";
