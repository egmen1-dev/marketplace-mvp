import { postTelemetry } from "../api/endpoints";
import { useAppStore } from "../store/app-store";
import { getBetaConfig } from "./config";
import { getBetaEnvironment } from "./environment";
import { getBuildInfo } from "./build-info";

const navigationPath: string[] = [];
let screenEnteredAt = Date.now();
let currentScreen = "boot";

export function getNavigationPath(): string[] {
  return [...navigationPath];
}

export function trackScreenOpen(screen: string): void {
  if (!getBetaConfig().sessionRecorderEnabled) return;
  const now = Date.now();
  const durationMs = now - screenEnteredAt;
  if (currentScreen && currentScreen !== screen) {
    navigationPath.push(currentScreen);
    if (navigationPath.length > 20) navigationPath.shift();
  }
  currentScreen = screen;
  screenEnteredAt = now;
  const env = getBetaEnvironment();
  const role = useAppStore.getState().userRole ?? "unknown";
  void postTelemetryWithMeta(screen, "screen_view", {
    metric: "screen_render",
    durationMs,
    navigationPath: [...navigationPath],
    userRole: role,
    model: env.deviceModel,
  });
}

export function trackButtonPress(screen: string, buttonId: string): void {
  if (!getBetaConfig().sessionRecorderEnabled) return;
  void postTelemetryWithMeta(screen, "button_press", { buttonId });
}

export function trackScrollDepth(screen: string, depthPercent: number): void {
  if (!getBetaConfig().sessionRecorderEnabled) return;
  void postTelemetryWithMeta(screen, "scroll_depth", { depthPercent });
}

export function trackBackPress(screen: string): void {
  if (!getBetaConfig().sessionRecorderEnabled) return;
  void postTelemetryWithMeta(screen, "back_press", { navigationPath: [...navigationPath] });
}

export function trackAbandonedFlow(screen: string, flow: string): void {
  if (!getBetaConfig().sessionRecorderEnabled) return;
  void postTelemetryWithMeta(screen, "abandoned_flow", { flow });
}

export function trackRageTap(screen: string, target: string): void {
  if (!getBetaConfig().sessionRecorderEnabled) return;
  void postTelemetryWithMeta(screen, "rage_tap", { target });
}

export function trackUnexpectedExit(screen: string): void {
  if (!getBetaConfig().sessionRecorderEnabled) return;
  void postTelemetryWithMeta(screen, "unexpected_exit", { navigationPath: [...navigationPath] });
}

async function postTelemetryWithMeta(
  screen: string,
  event: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const env = getBetaEnvironment();
  const build = getBuildInfo();
  try {
    await postTelemetry({
      screen,
      event,
      metadata: {
        ...metadata,
        buildNumber: build.buildNumber,
        channel: build.channel,
        commitSha: build.commitSha,
        deviceId: env.deviceId,
        sessionId: env.sessionId,
      },
    });
  } catch {
    // non-blocking
  }
}
