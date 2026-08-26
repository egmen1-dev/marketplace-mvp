/** Provider-neutral moderation provider contracts (EPIC 189.1). */

export type ProviderEvaluationStatus =
  | "EVALUATED"
  | "NOT_EVALUATED"
  | "UNAVAILABLE"
  | "FAILED"
  | "TIMEOUT";

export type OcrTextBlock = {
  text: string;
  normalizedText: string;
  confidence: number;
  language?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
};

export type OcrResult = {
  status: ProviderEvaluationStatus;
  provider: string;
  providerVersion: string;
  evaluatedAt: string;
  blocks: OcrTextBlock[];
  normalizedText: string;
  confidence: number;
  language?: string;
  rawResultHash: string;
  latencyMs: number;
  errorClass?: string;
  errorMessage?: string;
};

export type ImagePolicySignal = {
  signalId: string;
  label: string;
  policyClass?: string;
  confidence: number;
  detail?: string;
};

export type ImageModerationResult = {
  status: ProviderEvaluationStatus;
  provider: string;
  providerVersion: string;
  evaluatedAt: string;
  labels: Array<{ name: string; confidence: number }>;
  policySignals: ImagePolicySignal[];
  confidence: number;
  rawResultHash: string;
  latencyMs: number;
  errorClass?: string;
  errorMessage?: string;
  qrDetected?: boolean;
  qrPayload?: string | null;
};

export type ImageInput = {
  imageId: string;
  url: string;
  pathname?: string | null;
  alt?: string | null;
  sortOrder: number;
};

export type OcrProvider = {
  readonly id: string;
  readonly version: string;
  recognize(input: {
    imageId: string;
    bytes: Buffer;
    mimeType: string;
  }): Promise<OcrResult>;
};

export type ImageModerationProvider = {
  readonly id: string;
  readonly version: string;
  analyze(input: {
    imageId: string;
    bytes: Buffer;
    mimeType: string;
    ocrResult?: OcrResult | null;
  }): Promise<ImageModerationResult>;
};

export type PerImageEvaluation = {
  imageId: string;
  url: string;
  sortOrder: number;
  contentHash: string;
  ocr: OcrResult;
  image: ImageModerationResult;
};

export type LotImageEvaluationAggregate = {
  evaluatedAt: string;
  perImage: PerImageEvaluation[];
  combinedOcrText: string;
  ocrStatus: ProviderEvaluationStatus;
  imageStatus: ProviderEvaluationStatus;
  providerOcr: string;
  providerImage: string;
};
