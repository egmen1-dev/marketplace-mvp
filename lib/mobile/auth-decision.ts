/** Mobile auth strategy decision — EPIC-77 stacked merge release */

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
  const sessionMaxAgeSec = 60 * 60 * 24 * 14;
  const refreshImplemented = false;

  return {
    decision: "A",
    strategy: "existing_jwt_session",
    summary:
      "Decision A: existing Auth.js JWT session can power a native app via secure cookie jar or token bridge; dedicated refresh tokens are not required for MVP shell but refresh endpoint remains a release blocker.",
    webSessionUnchanged: true,
    jwtSessionStrategy: true,
    sessionMaxAgeSec,
    refreshImplemented,
    refreshBlocker: refreshImplemented
      ? null
      : "POST /api/mobile/auth/refresh returns 501 — implement before production APK without WebView cookie bridge",
    multiDeviceSupported: true,
    tokenInUrlForbidden: true,
    nativeAppReady: "PARTIAL",
    blockers: refreshImplemented
      ? []
      : ["mobile_refresh_not_implemented", "native_token_bridge_not_built"],
  };
}
