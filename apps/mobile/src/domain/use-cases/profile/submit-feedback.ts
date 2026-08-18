import type { FeedbackInput } from "../../contracts/entities/profile";
import type { DomainError } from "../../contracts/errors";
import type { ProfileRepository } from "../../contracts/repositories/index";
import type { Result } from "../../contracts/result";
import type { CommandUseCase } from "../../contracts/use-cases/index";

export class SubmitProductFeedback implements CommandUseCase<FeedbackInput, void> {
  constructor(private readonly profileRepository: ProfileRepository) {}

  execute(input: FeedbackInput): Promise<Result<void, DomainError>> {
    return this.profileRepository.submitFeedback(input);
  }
}
