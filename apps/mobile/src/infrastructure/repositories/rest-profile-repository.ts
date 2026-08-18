import type { ProfileRepository } from "../../domain/contracts/repositories/index";
import type { FeedbackInput, UserProfile } from "../../domain/contracts/entities/profile";
import type { AppMode } from "../../domain/contracts/entities/session";
import type { Result } from "../../domain/contracts/result";
import { err, ok } from "../../domain/contracts/result";
import { getDeviceId } from "../../storage/secure-session";
import { loadAppConfig } from "../../config/env";
import { mapApiErrorToDomain } from "../network/map-api-error";
import type { CommerceTransport } from "../transport/types";
import { mapProfileFromSession } from "../mappers/commerce-mapper";
import type { RestAuthRepository } from "./rest-auth-repository";

export class RestProfileRepository implements ProfileRepository {
  constructor(
    private readonly transport: CommerceTransport,
    private readonly authRepository: RestAuthRepository,
  ) {}

  async loadProfile(): Promise<Result<UserProfile>> {
    const sessionResult = await this.authRepository.getSession();
    if (!sessionResult.ok) return sessionResult;
    if (!sessionResult.value) {
      return err(mapApiErrorToDomain(new Error("No session")));
    }
    return ok(mapProfileFromSession(sessionResult.value, "buyer"));
  }

  async submitFeedback(input: FeedbackInput): Promise<Result<void>> {
    try {
      const appConfig = loadAppConfig();
      await this.transport.request<{ classification: string; recorded: boolean }>({
        path: "/api/product-ops/feedback",
        method: "POST",
        body: {
          content: input.content,
          screen: input.screen,
          deviceId: getDeviceId(),
          versionCode: Number(appConfig.buildNumber) || 1,
        },
      });
      return ok(undefined);
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async setAppMode(mode: AppMode): Promise<Result<UserProfile>> {
    const sessionResult = await this.authRepository.getSession();
    if (!sessionResult.ok) return sessionResult;
    if (!sessionResult.value) {
      return err(mapApiErrorToDomain(new Error("No session")));
    }
    return ok(mapProfileFromSession(sessionResult.value, mode));
  }
}
