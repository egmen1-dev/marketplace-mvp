import { ErrorUtils } from "react-native";

const bootMarks: string[] = [];
let fatalError: Error | null = null;
const fatalListeners = new Set<() => void>();
let handlersInstalled = false;

export function bootMark(label: string): string {
  const line = `BOOT ${bootMarks.length + 1}: ${label}`;
  bootMarks.push(line);
  console.log(`[LOT] ${line}`);
  return line;
}

export function getBootMarks(): readonly string[] {
  return bootMarks;
}

export function getFatalStartupError(): Error | null {
  return fatalError;
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
  bootMark(`FATAL (${source}): ${normalized.message}`);
  fatalListeners.forEach((listener) => listener());
  return normalized;
}

export function installStartupCrashHandlers(): void {
  if (handlersInstalled) return;
  handlersInstalled = true;

  const previous = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal !== false) {
      recordFatalStartupError(error, "global");
      // Do not delegate fatal errors — keep the app alive and show Startup Fatal Error UI.
      return;
    }
    previous?.(error, isFatal);
  });

  bootMark("startup crash handlers installed");
}

bootMark("early-boot module loaded");
installStartupCrashHandlers();
