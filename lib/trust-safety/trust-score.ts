import type { TrustLevelLabel } from "./types";

export function clampTrustScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function trustLevelLabel(score: number): TrustLevelLabel {
  if (score >= 80) return "Высокий уровень доверия";
  if (score >= 55) return "Средний уровень доверия";
  return "Начальный уровень доверия";
}

export function formatCompletionRate(completed: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((completed / total) * 100)}% заказов завершены`;
}

export function formatAccountTenure(joinedAt: Date | string): string {
  const days = Math.floor(
    (Date.now() - new Date(joinedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days < 30) return "Недавно на площадке";
  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30));
    return `На площадке ${months} мес.`;
  }
  const years = Math.floor(days / 365);
  return years === 1
    ? "На площадке более года"
    : `На площадке ${years} лет`;
}
