import { createHash } from "node:crypto";

type ContentVersionInput = {
  name: string;
  description: string | null;
  categoryId: string | null;
  productTypeId: string | null;
  condition: string;
  imageUrls: string[];
  characteristics: { definitionId: string; value: string | number }[];
};

export function computeContentVersionHash(input: ContentVersionInput): string {
  const payload = JSON.stringify({
    name: input.name.trim(),
    description: (input.description ?? "").trim(),
    categoryId: input.categoryId,
    productTypeId: input.productTypeId,
    condition: input.condition,
    imageUrls: [...input.imageUrls].sort(),
    characteristics: [...input.characteristics].sort((a, b) => a.definitionId.localeCompare(b.definitionId)),
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function bumpContentVersion(current: number): number {
  return current + 1;
}

export function moderationContentStale(
  moderatedHash: string | null | undefined,
  currentHash: string,
): boolean {
  if (!moderatedHash) return true;
  return moderatedHash !== currentHash;
}
