/**
 * Highest-fidelity seller journey harness without a physical device.
 * Mocks only infrastructure edges (network latency), not internal action outcomes.
 */

import { buildPhotoStepUiContract, type PhotoDraftImage } from "./photo-step-state";
import { createOneTapGuard } from "./one-tap-action";
import {
  isSilentAsyncFailure,
  type SubmitActionSnapshot,
} from "./submit-action-state";

export type JourneyStep = "photos" | "details" | "preview" | "success";

export type JourneyHarnessState = {
  step: JourneyStep;
  images: PhotoDraftImage[];
  pickerBusy: boolean;
  continueInFlight: boolean;
  publishing: boolean;
  error: string | null;
  publishOutcome: SubmitActionSnapshot["publishOutcome"];
  actionStarted: boolean;
  submitRequestCount: number;
};

export function createJourneyHarness(initial?: Partial<JourneyHarnessState>) {
  const continueGuard = createOneTapGuard();
  const submitGuard = createOneTapGuard();

  const state: JourneyHarnessState = {
    step: "photos",
    images: [],
    pickerBusy: false,
    continueInFlight: false,
    publishing: false,
    error: null,
    publishOutcome: null,
    actionStarted: false,
    submitRequestCount: 0,
    ...initial,
  };

  function photoUi() {
    return buildPhotoStepUiContract(state.images, {
      pickerBusy: state.pickerBusy,
      continueInFlight: state.continueInFlight,
    });
  }

  function submitSnapshot(): SubmitActionSnapshot {
    return {
      publishing: state.publishing,
      savingLot: false,
      step: state.step,
      publishOutcome: state.publishOutcome,
      error: state.error,
      actionStarted: state.actionStarted,
    };
  }

  return {
    getState: () => ({ ...state }),
    photoUi,
    submitSnapshot,
    isSilentSubmitFailure: () => isSilentAsyncFailure(submitSnapshot()),

    simulatePickerReturn(images: PhotoDraftImage[]) {
      state.pickerBusy = true;
      state.images = images;
      state.pickerBusy = false;
    },

    setImages(images: PhotoDraftImage[]) {
      state.images = images;
    },

    async tapContinue(latencyMs = 0): Promise<{ navigated: boolean; step: JourneyStep }> {
      if (state.step !== "photos") {
        return { navigated: false, step: state.step };
      }
      const readyUi = buildPhotoStepUiContract(state.images, {
        pickerBusy: state.pickerBusy,
        continueInFlight: false,
      });
      if (!readyUi.canContinue || readyUi.ctaDisabled) {
        return { navigated: false, step: state.step };
      }
      if (!continueGuard.tryBegin()) {
        return { navigated: false, step: state.step };
      }
      state.continueInFlight = true;
      try {
        if (latencyMs > 0) await defer(latencyMs);
        state.step = "details";
        return { navigated: true, step: state.step };
      } finally {
        state.continueInFlight = false;
        continueGuard.finish();
      }
    },

    async tapSubmit(
      server: () => Promise<{ ok: true; outcome: "PENDING_REVIEW" | "PUBLISHED" } | { ok: false; message: string }>,
      latencyMs = 0,
    ): Promise<{ step: JourneyStep; error: string | null }> {
      if (!submitGuard.tryBegin()) {
        return { step: state.step, error: state.error };
      }
      state.actionStarted = true;
      state.publishing = true;
      state.error = null;
      state.publishOutcome = null;
      try {
        if (latencyMs > 0) await defer(latencyMs);
        state.submitRequestCount += 1;
        const result = await server();
        if (!result.ok) {
          state.error = result.message;
          return { step: state.step, error: state.error };
        }
        state.publishOutcome = result.outcome;
        state.step = "success";
        return { step: state.step, error: null };
      } finally {
        state.publishing = false;
        submitGuard.finish();
      }
    },

    simulateCharacteristicRequiredSilentCatch() {
      state.actionStarted = true;
      state.publishing = true;
      state.error = null;
      state.publishing = false;
    },
  };
}

function defer(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
