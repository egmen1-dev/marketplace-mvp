import { buildMobileAuthDecisionReport } from "./auth-decision";

export type NativeAppShellStartStatus = "READY" | "NOT_READY";

export function evaluateNativeAppShellStartGate(): {
  status: NativeAppShellStartStatus;
  nativeAuthReady: string;
  note: string;
} {
  const auth = buildMobileAuthDecisionReport();
  const status: NativeAppShellStartStatus =
    auth.refreshImplemented && auth.nativeAppReady === "YES" ? "READY" : "NOT_READY";

  return {
    status,
    nativeAuthReady: auth.nativeAppReady,
    note:
      status === "READY"
        ? "Backend contracts stable — APP-SHELL-0 may start (separate epic)"
        : "Complete app shell backend gates first",
  };
}
