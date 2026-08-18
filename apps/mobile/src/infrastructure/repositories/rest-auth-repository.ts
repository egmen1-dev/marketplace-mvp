import type { Result } from "../../domain/contracts/result";
import { err, ok } from "../../domain/contracts/result";
import type { AuthRepository } from "../../domain/contracts/repositories/index";
import type { LoginCredentials, Session, AccessToken } from "../../domain/contracts/entities/session";
import { login as apiLogin, logout as apiLogout } from "../../api/client";
import { getAccessToken, getRefreshToken, getSessionMeta } from "../../storage/secure-session";
import { mapAccessToken, mapSessionFromLogin } from "../mappers/commerce-mapper";
import { mapApiErrorToDomain } from "../network/map-api-error";
import type { CommerceTransport } from "../transport/types";

export class RestAuthRepository implements AuthRepository {
  constructor(private readonly transport: CommerceTransport) {}

  async login(credentials: LoginCredentials): Promise<Result<Session>> {
    try {
      const data = await apiLogin({ email: credentials.email, password: credentials.password });
      return ok(mapSessionFromLogin(data));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async logout(): Promise<Result<void>> {
    try {
      await apiLogout();
      return ok(undefined);
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async restoreSession(): Promise<Result<Session | null>> {
    return this.getSession();
  }

  async refreshToken(): Promise<Result<AccessToken>> {
    try {
      const token = await getAccessToken();
      if (!token) return err(mapApiErrorToDomain(new Error("No session")));
      return ok(mapAccessToken(token));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }

  async getSession(): Promise<Result<Session | null>> {
    try {
      const meta = await getSessionMeta();
      const token = await getAccessToken();
      const refresh = await getRefreshToken();
      if (!meta || !token || !refresh) return ok(null);
      return ok(
        mapSessionFromLogin({
          userId: meta.userId,
          role: meta.role,
          sessionId: meta.sessionId,
          accessToken: token,
        }),
      );
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }
}
