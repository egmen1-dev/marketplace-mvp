import type { ProductQualityInput } from "../../types";
import type { DaosCriticRequest, DaosCriticResponse } from "./types";

export function mapProductToDaosRequest(input: ProductQualityInput): DaosCriticRequest {
  return {
    productId: input.productId,
    name: input.name,
    description: input.description,
    categoryName: input.categoryName,
    images: input.images.map((img) => ({
      url: img.url,
      isPrimary: img.isPrimary,
      alt: img.alt,
    })),
    characteristics: input.characteristics.map((c) => ({
      name: c.name,
      value: c.value,
    })),
    hasVideo: input.hasVideo,
  };
}

export function mergeDaosHints(
  input: ProductQualityInput,
  response: DaosCriticResponse,
): ProductQualityInput {
  if (!response.ok || !response.factors) return input;

  const f = response.factors;
  return {
    ...input,
    hints: {
      ...input.hints,
      photoRelevance: f.photoRelevance?.score ?? input.hints?.photoRelevance,
      primaryPhotoQuality: f.photoQuality?.score ?? input.hints?.primaryPhotoQuality,
      thumbnailQuality: f.thumbnail?.score ?? input.hints?.thumbnailQuality,
      commercialVisibility: f.commercialVisibility?.score ?? input.hints?.commercialVisibility,
      compositionScore: f.composition?.score ?? input.hints?.compositionScore,
      backgroundScore: f.background?.score ?? input.hints?.backgroundScore,
      lightingScore: f.lighting?.score ?? input.hints?.lightingScore,
      readabilityScore: f.readability?.score ?? input.hints?.readabilityScore,
      productIdentityScore: f.productIdentity?.score ?? input.hints?.productIdentityScore,
      productIdentityMismatch:
        (f.productIdentity?.score ?? 100) < 20 ? true : input.hints?.productIdentityMismatch,
      irrelevantPhotos:
        (f.photoRelevance?.score ?? 100) < 15 ? true : input.hints?.irrelevantPhotos,
    },
  };
}
