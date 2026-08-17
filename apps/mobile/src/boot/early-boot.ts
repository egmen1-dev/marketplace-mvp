import { getMobileBuildInfo } from "../config/build-info";
import { persistPreviousCrash } from "./previous-crash";

type GlobalErrorUtils = {
  getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

const ErrorUtils = (globalThis as typeof globalThis & { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;

const bootMarks: string[] = [];
let fatalError: Error | null = null;
let fatalStage = "unknown";
let fatalCrashId: string | null = null;
const fatalListeners = new Set<() => void>();
let handlersInstalled = false;

function generateCrashId(): string {
  return `crash-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function bootMark(label: string): string {
  const line = `BOOT ${bootMarks.length + 1}: ${label}`;
  bootMarks.push(line);
  console.log(`[LOT] ${line}`);
  return line;
}

/** Named stage markers for logcat correlation (PART 8). */
export function bootStage(stage: string): string {
  return bootMark(stage);
}

export function getBootMarks(): readonly string[] {
  return bootMarks;
}

export function getFatalStartupError(): Error | null {
  return fatalError;
}

export function getFatalCrashId(): string | null {
  return fatalCrashId;
}

export function getFatalStage(): string {
  return fatalStage;
}

export function subscribeFatalStartup(listener: () => void): () => void {
  fatalListeners.add(listener);
  return () => {
    fatalListeners.delete(listener);
  };
}

export function recordFatalStartupError(error: unknown, source = "unknown"): Error {
  const normalized =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Unknown startup exception");
  fatalError = normalized;
  fatalStage = source;
  fatalCrashId = generateCrashId();
  bootMark(`FATAL (${source}): ${normalized.message}`);

  const build = getMobileBuildInfo();
  void persistPreviousCrash({
    crashId: fatalCrashId,
    stage: source,
    message: normalized.message,
    recordedAt: new Date().toISOString(),
    versionName: build.versionName,
    versionCode: build.versionCode,
    gitSha: build.gitSha,
  });

  fatalListeners.forEach((listener) => listener());
  return normalized;
}

export function installStartupCrashHandlers(): void {
  if (handlersInstalled) return;
  handlersInstalled = true;

  if (!ErrorUtils || !ErrorUtils.getGlobalHandler || !ErrorUtils.setGlobalHandler) {
    bootMark("ErrorUtils unavailable");
    return;
  }

  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    if (isFatal !== false) {
      recordFatalStartupError(error, "global");
      // Allow fatal UI to mount; still delegate so RN can report/crash correctly (PART 15).
      queueMicrotask(() => {
        previous?.(error, isFatal);
      });
      return;
    }
    previous?.(error, isFatal);
  });

  bootMark("startup crash handlers installed");
}

bootStage("JS_BUNDLE_START");
installStartupCrashHandlers();
