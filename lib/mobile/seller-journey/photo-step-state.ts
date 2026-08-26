/** Canonical photo-step action phases for seller LOT create. */

export type PhotoDraftImage = {
  uploadStatus?: "idle" | "uploading" | "uploaded" | "failed";
  uploadedUrl?: string;
};

export type PhotoStepPhase = "EMPTY" | "PICKING" | "PROCESSING" | "UPLOADING" | "READY" | "ERROR";

export type PhotoStepUiContract = {
  phase: PhotoStepPhase;
  canContinue: boolean;
  ctaLoading: boolean;
  ctaDisabled: boolean;
  hint: string | null;
};

export function derivePhotoStepPhase(
  images: PhotoDraftImage[],
  options?: { pickerBusy?: boolean },
): PhotoStepPhase {
  if (options?.pickerBusy) return "PICKING";
  if (images.length === 0) return "EMPTY";
  if (images.some((img) => img.uploadStatus === "failed" && !img.uploadedUrl)) return "ERROR";
  if (images.some((img) => img.uploadStatus === "idle")) return "PROCESSING";
  if (images.some((img) => img.uploadStatus === "uploading")) return "UPLOADING";
  return "READY";
}

export function buildPhotoStepUiContract(
  images: PhotoDraftImage[],
  options?: { pickerBusy?: boolean; continueInFlight?: boolean },
): PhotoStepUiContract {
  const phase = derivePhotoStepPhase(images, options);
  const continueInFlight = options?.continueInFlight ?? false;

  switch (phase) {
    case "EMPTY":
      return { phase, canContinue: false, ctaLoading: continueInFlight, ctaDisabled: true, hint: null };
    case "PICKING":
      return {
        phase,
        canContinue: false,
        ctaLoading: true,
        ctaDisabled: true,
        hint: null,
      };
    case "PROCESSING":
      return {
        phase,
        canContinue: false,
        ctaLoading: true,
        ctaDisabled: true,
        hint: "Обрабатываем фото…",
      };
    case "UPLOADING":
      return {
        phase,
        canContinue: true,
        ctaLoading: continueInFlight,
        ctaDisabled: continueInFlight,
        hint: "Загружаем фото…",
      };
    case "ERROR":
      return {
        phase,
        canContinue: false,
        ctaLoading: false,
        ctaDisabled: true,
        hint: "Не удалось загрузить фото",
      };
    case "READY":
      return {
        phase,
        canContinue: true,
        ctaLoading: continueInFlight,
        ctaDisabled: continueInFlight,
        hint: null,
      };
  }
}
