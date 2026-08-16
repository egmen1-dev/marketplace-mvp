import type { DaosVisualSignals } from "./types";

export function normalizeDaosSignals(input?: Partial<DaosVisualSignals>): DaosVisualSignals {
  const connected = input?.connected ?? false;
  return {
    visualIdentity: input?.visualIdentity ?? null,
    composition: input?.composition ?? null,
    background: input?.background ?? null,
    lighting: input?.lighting ?? null,
    thumbnailQuality: input?.thumbnailQuality ?? null,
    contrast: input?.contrast ?? null,
    commercialVisibility: input?.commercialVisibility ?? null,
    connected,
    source: connected ? input?.source ?? "daos-live" : "daos-not-connected",
  };
}

export function applyDaosToVisualGenome(
  visualScore: number | null,
  daos: DaosVisualSignals,
): number | null {
  if (visualScore == null) return null;
  if (!daos.connected) return visualScore;

  const signals = [
    daos.thumbnailQuality,
    daos.composition,
    daos.lighting,
    daos.commercialVisibility,
  ].filter((v): v is number => v != null);

  if (signals.length === 0) return visualScore;
  const avg = signals.reduce((a, b) => a + b, 0) / signals.length;
  return Math.round(visualScore * 0.6 + avg * 0.4);
}

export function daosSignalsFromContentQuality(input: {
  photoQuality?: number | null;
  thumbnailQuality?: number | null;
  photoContrast?: number | null;
  connected?: boolean;
}): DaosVisualSignals {
  return normalizeDaosSignals({
    connected: input.connected ?? false,
    source: input.connected ? "daos/marketplace-content-quality" : "content-quality-fallback",
    visualIdentity: input.photoQuality ?? null,
    thumbnailQuality: input.thumbnailQuality ?? null,
    contrast: input.photoContrast ?? null,
    composition: input.photoQuality != null ? Math.round(input.photoQuality * 0.95) : null,
    lighting: input.photoQuality != null ? Math.round(input.photoQuality * 0.9) : null,
    commercialVisibility: input.thumbnailQuality ?? null,
    background: input.photoQuality != null ? Math.round(input.photoQuality * 0.85) : null,
  });
}
