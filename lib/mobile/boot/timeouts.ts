import { BootStage } from "./types";

export const BOOT_STAGE_TIMEOUT_MS: Record<Exclude<BootStage, BootStage.DONE>, number> = {
  [BootStage.BOOTSTRAP]: 8_000,
  [BootStage.REMOTE_CONFIG]: 8_000,
  [BootStage.UPDATE]: 5_000,
  [BootStage.SESSION]: 5_000,
  [BootStage.NAVIGATION]: 3_000,
};

/** Safety net if the pipeline hangs without resolving a stage timeout. */
export const BOOT_HARD_TIMEOUT_MS = 30_000;
