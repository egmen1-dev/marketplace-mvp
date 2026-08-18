import type { UserProfile } from "../../contracts/entities/profile";
import type { DomainError } from "../../contracts/errors";
import type { ProfileRepository } from "../../contracts/repositories/index";
import type { DomainEventBus } from "../../contracts/events";
import type { Result } from "../../contracts/result";
import type { QueryUseCase } from "../../contracts/use-cases/index";

export class LoadProfile implements QueryUseCase<Record<string, never>, UserProfile> {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly events: DomainEventBus,
  ) {}

  async execute(_input: Record<string, never>): Promise<Result<UserProfile, DomainError>> {
    const result = await this.profileRepository.loadProfile();
    if (result.ok) {
      this.events.publish({ type: "ProfileUpdated", profile: result.value });
    }
    return result;
  }
}
