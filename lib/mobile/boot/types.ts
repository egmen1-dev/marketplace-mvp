export enum BootStage {
  BOOTSTRAP = "BOOTSTRAP",
  REMOTE_CONFIG = "REMOTE_CONFIG",
  UPDATE = "UPDATE",
  SESSION = "SESSION",
  NAVIGATION = "NAVIGATION",
  DONE = "DONE",
}

export type BootStageStatus = "pending" | "running" | "success" | "failed" | "skipped" | "recovered";

export interface BootFailure {
  stage: BootStage;
  code: string;
  message: string;
  httpStatus?: number;
  durationMs: number;
  retryable: boolean;
  stack?: string;
}

export interface BootStageReport {
  stage: BootStage;
  status: BootStageStatus;
  durationMs: number;
  code?: string;
  message?: string;
  httpStatus?: number;
}

export interface StartupReport {
  success: boolean;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
  destination?: "login" | "app";
  failure?: BootFailure;
  stages: BootStageReport[];
}

export type StartupDestination = "login" | "app";

export const BOOT_STAGE_LABELS: Record<BootStage, string> = {
  [BootStage.BOOTSTRAP]: "Bootstrap",
  [BootStage.REMOTE_CONFIG]: "Remote Config",
  [BootStage.UPDATE]: "Update",
  [BootStage.SESSION]: "Session",
  [BootStage.NAVIGATION]: "Navigation",
  [BootStage.DONE]: "Done",
};
