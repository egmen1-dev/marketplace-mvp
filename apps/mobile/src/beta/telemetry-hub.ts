import { postTelemetry } from "../api/endpoints";
import { getBetaEnvironment } from "./environment";
import { getBuildInfo } from "./build-info";

export type TelemetryMetadata = Record<string, unknown>;

export async function trackEvent(
  screen: string,
  event: string,
  metadata?: TelemetryMetadata,
  errorCode?: string,
): Promise<void> {
  const env = getBetaEnvironment();
  const build = getBuildInfo();
  try {
    await postTelemetry({
      screen,
      event,
      errorCode,
      metadata: {
        ...(metadata ?? {}),
        deviceId: env.deviceId,
        sessionId: env.sessionId,
        buildNumber: build.buildNumber,
        channel: build.channel,
      },
    });
  } catch {
    // non-blocking
  }
}
