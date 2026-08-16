/** Mobile auth strategy decision — EPIC-77 final gate */

export type MobileAuthDecision = "A" | "B";

export type MobileAuthDecisionReport = {
  decision: MobileAuthDecision;
  strategy: string;
  summary: string;
  webSessionUnchanged: true;
  jwtSessionStrategy: true;
  sessionMaxAgeSec: number;
  refreshImplemented: boolean;
  refreshBlocker: string | null;
  multiDeviceSupported: boolean;
  tokenInUrlForbidden: true;
  nativeAppReady: "PARTIAL" | "YES" | "NO";
  blockers: string[];
};

export function buildMobileAuthDecisionReport(): MobileAuthDecisionReport {
  return {
    decision: "A",
    strategy: "existing_jwt_session_extended",
    summary:
      "Decision A: Auth.js JWT extended with mobile access/refresh tokens and session registry. Web cookie sessions unchanged.",
    webSessionUnchanged: true,
    jwtSessionStrategy: true,
    sessionMaxAgeSec: 60 * 60 * 24 * 14,
    refreshImplemented: true,
    refreshBlocker: null,
    multiDeviceSupported: true,
    tokenInUrlForbidden: true,
    nativeAppReady: "YES",
    blockers: [],
  };
}
