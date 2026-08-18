import type { Session, LoginCredentials } from "../../contracts/entities/session";
import type { DomainError } from "../../contracts/errors";
import type { AuthRepository } from "../../contracts/repositories/index";
import type { DomainEventBus } from "../../contracts/events";
import type { Result } from "../../contracts/result";
import type { CommandUseCase } from "../../contracts/use-cases/index";

export type LoginUserInput = LoginCredentials & { pendingDeepLink?: string };

export interface LoginAuthGateway extends AuthRepository {
  loginWithOptions(input: LoginUserInput): Promise<Result<Session>>;
}

export class LoginUser implements CommandUseCase<LoginUserInput, Session> {
  constructor(
    private readonly authRepository: LoginAuthGateway,
    private readonly events: DomainEventBus,
  ) {}

  async execute(input: LoginUserInput): Promise<Result<Session, DomainError>> {
    const result = await this.authRepository.loginWithOptions(input);
    if (result.ok) {
      this.events.publish({
        type: "ProfileUpdated",
        profile: {
          email: result.value.email,
          displayName: result.value.userId,
          mode: "buyer",
          sellerCapable: result.value.sellerCapable,
        },
      });
    }
    return result;
  }
}

export class LogoutUser implements CommandUseCase<Record<string, never>, void> {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly events: DomainEventBus,
  ) {}

  async execute(_input: Record<string, never>): Promise<Result<void, DomainError>> {
    const session = await this.authRepository.getSession();
    const result = await this.authRepository.logout();
    if (result.ok) {
      this.events.publish({
        type: "SessionExpired",
        reason: "logout",
        previousSession: session.ok ? session.value ?? undefined : undefined,
      });
    }
    return result;
  }
}
