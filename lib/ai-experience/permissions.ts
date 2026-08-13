export class AiExperienceForbiddenError extends Error {
  readonly status = 403;

  constructor(message = "AI Experience недоступен") {
    super(message);
    this.name = "AiExperienceForbiddenError";
  }
}

export function assertAiExperienceAdminAccess(role: string | undefined): void {
  if (role !== "ADMIN") {
    throw new AiExperienceForbiddenError();
  }
}

export function assertSellerAiCenterAccess(role: string | undefined): void {
  if (role !== "SELLER" && role !== "ADMIN") {
    throw new AiExperienceForbiddenError("Центр роста доступен продавцам");
  }
}
