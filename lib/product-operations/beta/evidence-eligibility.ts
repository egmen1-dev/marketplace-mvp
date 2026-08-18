/**
 * Closed Beta release metrics must not include validation / automated test probes.
 * Pre-baseline probes remain in DB for audit but are excluded from readiness gates.
 */

export type BetaEvidenceSource = "REAL_USER" | "VALIDATION" | "AUTOMATED_TEST";

export type BetaEvidenceBaseline = {
  commit: string;
  effectiveAt: string;
  policy: string;
};

/** Measurement baseline — evidence on/after this deploy is eligible if not validation. */
export const CLOSED_BETA_EVIDENCE_BASELINE: BetaEvidenceBaseline = {
  commit: "74abf11",
  effectiveAt: "2026-08-18T14:55:59.828Z",
  policy:
    "Pre-baseline EPIC 102–108 validation probes remain archived in DB but are excluded from Closed Beta release metrics.",
};

const VALIDATION_SCREEN_PREFIXES = ["epic10", "epic103", "epic104", "epic105"];
const VALIDATION_SESSION_PREFIXES = ["epic103", "epic104", "epic105"];
const VALIDATION_DEVICE_MARKERS = ["epic103", "epic104", "epic105", "epic103-test"];

function metaRecord(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

export function normalizeEvidenceSource(value: unknown): BetaEvidenceSource | null {
  if (value === "REAL_USER" || value === "VALIDATION" || value === "AUTOMATED_TEST") {
    return value;
  }
  return null;
}

export function inferEvidenceSource(input: {
  evidenceSource?: unknown;
  screen?: string | null;
  sessionId?: string | null;
  deviceId?: string | null;
  content?: string | null;
  metadata?: unknown;
}): BetaEvidenceSource {
  const explicit = normalizeEvidenceSource(input.evidenceSource);
  if (explicit) return explicit;

  const meta = metaRecord(input.metadata);
  const metaSource = normalizeEvidenceSource(meta.evidenceSource);
  if (metaSource) return metaSource;

  if (meta.validationMarker || meta.validationProbe === true) return "VALIDATION";
  if (meta.errorMessage === "BETA_VALIDATION_CONTROLLED_CRASH") return "VALIDATION";

  const screen = (input.screen ?? "").toLowerCase();
  if (VALIDATION_SCREEN_PREFIXES.some((p) => screen.startsWith(p))) return "VALIDATION";

  const sessionId = (input.sessionId ?? "").toLowerCase();
  if (VALIDATION_SESSION_PREFIXES.some((p) => sessionId.startsWith(p))) return "VALIDATION";

  const deviceId = (input.deviceId ?? "").toLowerCase();
  if (VALIDATION_DEVICE_MARKERS.some((m) => deviceId.includes(m))) return "VALIDATION";

  const content = (input.content ?? "").toLowerCase();
  if (content.includes("epic103") || content.includes("epic104") || content.includes("epic105")) {
    if (content.includes("controlled") || content.includes("probe") || content.includes("validation")) {
      return "VALIDATION";
    }
  }

  if (metaSource === null && meta.automatedTest === true) return "AUTOMATED_TEST";

  return "REAL_USER";
}

export function isAfterEvidenceBaseline(createdAt: Date): boolean {
  return createdAt.getTime() >= new Date(CLOSED_BETA_EVIDENCE_BASELINE.effectiveAt).getTime();
}

export function isEligibleReleaseMetric(input: {
  createdAt: Date;
  evidenceSource?: unknown;
  screen?: string | null;
  sessionId?: string | null;
  deviceId?: string | null;
  content?: string | null;
  metadata?: unknown;
}): boolean {
  if (!isAfterEvidenceBaseline(input.createdAt)) return false;
  const source = inferEvidenceSource(input);
  return source === "REAL_USER";
}

export function withEvidenceSource(
  metadata: Record<string, unknown> | undefined,
  source: BetaEvidenceSource,
  marker?: string,
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    evidenceSource: source,
    ...(marker ? { validationMarker: marker } : {}),
  };
}
