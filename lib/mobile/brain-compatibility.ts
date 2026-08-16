import { BRAIN_SCHEMA_VERSION, MIN_SUPPORTED_BRAIN_SCHEMA_VERSION } from "@/lib/ccos/evolution/types";

export { BRAIN_SCHEMA_VERSION, MIN_SUPPORTED_BRAIN_SCHEMA_VERSION };

export function buildBrainCompatibilityFields() {
  return {
    brainSchemaVersion: BRAIN_SCHEMA_VERSION,
    minimumSupportedBrainSchemaVersion: MIN_SUPPORTED_BRAIN_SCHEMA_VERSION,
  };
}
