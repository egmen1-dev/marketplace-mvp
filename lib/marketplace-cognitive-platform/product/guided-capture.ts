import type { ProductUnderstanding } from "@/lib/ccos/product";

export type GuidedCaptureStep = {
  id: string;
  title: string;
  instruction: string;
  order: number;
  qualityHint?: string;
};

export type GuidedCaptureSession = {
  productId?: string;
  steps: GuidedCaptureStep[];
  currentStep: number;
  advisoryOnly: true;
};

export type GuidedCaptureEvaluation = {
  stepId: string;
  preliminaryScore: number | null;
  feedback: string;
  pass: boolean;
};

const DEFAULT_STEPS: GuidedCaptureStep[] = [
  { id: "hero", title: "Главное фото", instruction: "Сделайте главное фото крупным планом на нейтральном фоне", order: 1 },
  { id: "overview", title: "Общий вид", instruction: "Покажите товар целиком в контексте использования", order: 2 },
  { id: "kit", title: "Комплектация", instruction: "Сфотографируйте комплект поставки", order: 3 },
  { id: "specs", title: "Характеристики", instruction: "Добавьте фото/инфографику ключевых параметров", order: 4 },
  { id: "video", title: "Видео", instruction: "Короткое видео демонстрации (опционально)", order: 5 },
];

export function startGuidedCapture(productId?: string, packIdealPhotos?: string[]): GuidedCaptureSession {
  const steps = DEFAULT_STEPS.map((s, i) => ({
    ...s,
    qualityHint: packIdealPhotos?.[i] ?? undefined,
  }));
  return { productId, steps, currentStep: 0, advisoryOnly: true };
}

export function evaluateCaptureStep(input: {
  stepId: string;
  photoCount?: number;
  understanding?: ProductUnderstanding;
}): GuidedCaptureEvaluation {
  const visual = input.understanding?.genome.dimensions.visual ?? null;
  let preliminaryScore = visual;
  let feedback = "Предварительная оценка недоступна";
  let pass = false;

  if (input.stepId === "hero") {
    preliminaryScore = input.photoCount && input.photoCount >= 1 ? Math.max(55, visual ?? 55) : 30;
    feedback =
      preliminaryScore >= 55
        ? "Главное фото принято для предварительной оценки"
        : "Добавьте более чёткое главное фото";
    pass = preliminaryScore >= 55;
  } else if (input.stepId === "specs") {
    const functional = input.understanding?.genome.dimensions.functional ?? null;
    preliminaryScore = functional;
    feedback = functional != null && functional >= 60 ? "Характеристики выглядят достаточно полными" : "Добавьте ключевые параметры";
    pass = (functional ?? 0) >= 55;
  } else {
    preliminaryScore = visual;
    feedback = "Шаг зафиксирован — продолжайте съёмку";
    pass = true;
  }

  return { stepId: input.stepId, preliminaryScore, feedback, pass };
}

export function advanceCaptureStep(session: GuidedCaptureSession): GuidedCaptureSession {
  return {
    ...session,
    currentStep: Math.min(session.currentStep + 1, session.steps.length - 1),
  };
}
