let currentStage = "app_init";

export function getCurrentBootStage(): string {
  return currentStage;
}

export function setCurrentBootStage(stage: string): void {
  currentStage = stage;
}

export function resetBootStage(): void {
  currentStage = "app_init";
}
