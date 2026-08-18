import type { TelemetryRepository, DomainTelemetryEvent } from "../../domain/contracts/repositories/index";
import type { Result } from "../../domain/contracts/result";
import { ok } from "../../domain/contracts/result";
import { loadAppConfig } from "../../config/env";
import { getDeviceId } from "../../storage/secure-session";
import { getSessionId } from "../../telemetry/session";
import type { CommerceTransport } from "../transport/types";

export class RestTelemetryRepository implements TelemetryRepository {
  constructor(private readonly transport: CommerceTransport) {}

  async track(event: DomainTelemetryEvent): Promise<Result<void>> {
    const appConfig = loadAppConfig();
    try {
      await this.transport.request({
        path: "/api/mobile/telemetry",
        method: "POST",
        body: {
          appVersion: appConfig.appVersion,
          platform: "android",
          sessionId: getSessionId(),
          deviceId: getDeviceId(),
          versionCode: Number(appConfig.buildNumber) || 1,
          screen: event.payload?.screen ?? "unknown",
          event: event.name,
          errorCode: event.errorCode,
          ...event.payload,
        },
        retry: false,
      });
    } catch {
      // telemetry must not block UX
    }
    return ok(undefined);
  }
}

export function trackScreenEvent(
  telemetry: RestTelemetryRepository,
  input: { screen: string; event: string; errorCode?: string },
): void {
  void telemetry.track({ name: input.event, payload: input, errorCode: input.errorCode });
}
