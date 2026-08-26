/** Canonical submit/publish action phases for seller LOT create. */

export type SubmitActionPhase =
  | "IDLE"
  | "VALIDATING"
  | "WAITING_FOR_UPLOADS"
  | "SAVING"
  | "SUBMITTING"
  | "SUCCESS_PENDING_REVIEW"
  | "SUCCESS_PUBLISHED"
  | "SUCCESS_SAVED"
  | "ERROR";

export type SubmitActionSnapshot = {
  publishing: boolean;
  savingLot: boolean;
  step: "photos" | "details" | "preview" | "success";
  publishOutcome: "PUBLISHED" | "PENDING_REVIEW" | "SAVED" | "FAILED" | null;
  error: string | null;
  actionStarted: boolean;
};

export type AsyncActionOutcome = "SUCCESS" | "VISIBLE_ERROR" | "IN_FLIGHT" | "IDLE_WITHOUT_OUTCOME";

export function deriveSubmitActionPhase(snapshot: SubmitActionSnapshot): SubmitActionPhase {
  if (snapshot.step === "success") {
    if (snapshot.publishOutcome === "PUBLISHED") return "SUCCESS_PUBLISHED";
    if (snapshot.publishOutcome === "PENDING_REVIEW") return "SUCCESS_PENDING_REVIEW";
    return "SUCCESS_SAVED";
  }
  if (snapshot.error) return "ERROR";
  if (snapshot.publishing) return "SUBMITTING";
  if (snapshot.savingLot) return "SAVING";
  if (snapshot.actionStarted) return "VALIDATING";
  return "IDLE";
}

/** Enforces ACTION_STARTED → SUCCESS | VISIBLE_ERROR (never silent idle). */
export function resolveAsyncActionOutcome(snapshot: SubmitActionSnapshot): AsyncActionOutcome {
  const phase = deriveSubmitActionPhase(snapshot);
  if (phase.startsWith("SUCCESS")) return "SUCCESS";
  if (phase === "ERROR") return "VISIBLE_ERROR";
  if (snapshot.actionStarted && (snapshot.publishing || snapshot.savingLot)) return "IN_FLIGHT";
  if (snapshot.actionStarted && !snapshot.publishing && !snapshot.savingLot && snapshot.step !== "success" && !snapshot.error) {
    return "IDLE_WITHOUT_OUTCOME";
  }
  return "IN_FLIGHT";
}

export function isSilentAsyncFailure(snapshot: SubmitActionSnapshot): boolean {
  return resolveAsyncActionOutcome(snapshot) === "IDLE_WITHOUT_OUTCOME";
}
