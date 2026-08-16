import { loadAppConfig } from "../config/env";
import { BOOT_STAGE_LABELS, BootStage, type BootFailure, type BootStageReport, type StartupReport } from "./boot-types";

type StageTimer = {
  stage: BootStage;
  startedAt: number;
};

class BootLoggerImpl {
  private bootStartedAt = 0;
  private stageTimer: StageTimer | null = null;
  private stages: BootStageReport[] = [];
  private lastReport: StartupReport | null = null;
  private lastFailure: BootFailure | null = null;

  reset(): void {
    this.bootStartedAt = Date.now();
    this.stageTimer = null;
    this.stages = [];
    this.lastFailure = null;
    if (__DEV__) {
      console.log("BOOT START");
    }
  }

  stageStart(stage: BootStage): void {
    this.stageTimer = { stage, startedAt: Date.now() };
    const label = BOOT_STAGE_LABELS[stage].toUpperCase();
    if (__DEV__) {
      console.log(`${label} START`);
    }
  }

  stageSuccess(stage: BootStage, durationMs: number): void {
    this.pushStage({ stage, status: "success", durationMs });
    const label = BOOT_STAGE_LABELS[stage].toUpperCase();
    if (__DEV__) {
      console.log(`${label} SUCCESS (${durationMs}ms)`);
    }
    this.stageTimer = null;
  }

  stageRecovered(stage: BootStage, durationMs: number, message: string): void {
    this.pushStage({ stage, status: "recovered", durationMs, message });
    const label = BOOT_STAGE_LABELS[stage].toUpperCase();
    if (__DEV__) {
      console.log(`${label} RECOVERED (${durationMs}ms) — ${message}`);
    }
    this.stageTimer = null;
  }

  stageSkipped(stage: BootStage, durationMs: number, message: string): void {
    this.pushStage({ stage, status: "skipped", durationMs, message });
    this.stageTimer = null;
  }

  stageFail(stage: BootStage, failure: BootFailure): void {
    this.lastFailure = failure;
    this.pushStage({
      stage,
      status: "failed",
      durationMs: failure.durationMs,
      code: failure.code,
      message: failure.message,
      httpStatus: failure.httpStatus,
    });
    const label = BOOT_STAGE_LABELS[stage].toUpperCase();
    if (__DEV__) {
      console.log(`${label} FAIL — ${failure.message}${failure.httpStatus ? ` HTTP ${failure.httpStatus}` : ""}`);
      console.log("SHOW ERROR SCREEN");
    }
    this.stageTimer = null;
  }

  complete(success: boolean, destination?: "login" | "app"): StartupReport {
    const finishedAt = Date.now();
    const report: StartupReport = {
      success,
      durationMs: finishedAt - this.bootStartedAt,
      startedAt: new Date(this.bootStartedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      destination,
      failure: success ? undefined : this.lastFailure ?? undefined,
      stages: [...this.stages],
    };
    this.lastReport = report;
    this.printDevSummary(report);
    return report;
  }

  getLastReport(): StartupReport | null {
    return this.lastReport;
  }

  getLastFailure(): BootFailure | null {
    return this.lastFailure;
  }

  elapsedMs(): number {
    return Date.now() - this.bootStartedAt;
  }

  currentStageDurationMs(): number {
    if (!this.stageTimer) return 0;
    return Date.now() - this.stageTimer.startedAt;
  }

  private pushStage(stage: BootStageReport): void {
    const idx = this.stages.findIndex((s) => s.stage === stage.stage);
    if (idx >= 0) this.stages[idx] = stage;
    else this.stages.push(stage);
  }

  private printDevSummary(report: StartupReport): void {
    if (!__DEV__) return;

    const lines = ["=====================", "BOOT PIPELINE", "====================="];
    for (const stage of report.stages) {
      const label = BOOT_STAGE_LABELS[stage.stage];
      const icon = stage.status === "failed" ? "✗" : stage.status === "recovered" || stage.status === "skipped" ? "~" : "✓";
      lines.push(`${icon} ${label} ${stage.durationMs}ms${stage.message ? ` — ${stage.message}` : ""}`);
      if (stage.httpStatus) lines.push(`  HTTP ${stage.httpStatus}`);
    }
    lines.push("=====================");
    lines.push(`Total ${report.durationMs}ms · ${report.success ? "OK" : "FAIL"}`);
    console.log(lines.join("\n"));
  }

  getDiagnosticsMeta() {
    const config = loadAppConfig();
    return {
      appVersion: config.appVersion,
      buildNumber: config.buildNumber,
      environment: config.releaseChannel,
      commit: process.env.EXPO_PUBLIC_GIT_COMMIT ?? "unknown",
    };
  }
}

export const bootLogger = new BootLoggerImpl();
