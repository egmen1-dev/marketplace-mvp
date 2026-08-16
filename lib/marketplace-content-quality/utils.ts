export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

export function overlapRatio(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const hits = a.filter((t) => setB.has(t)).length;
  return hits / Math.max(1, Math.min(a.length, b.length));
}

export function detectKeywordStuffing(text: string): boolean {
  const lower = text.toLowerCase();
  const tokens = tokenize(lower);
  if (tokens.length < 8) return false;
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  const maxFreq = Math.max(...freq.values());
  const uniqueRatio = freq.size / tokens.length;
  return maxFreq >= 6 || uniqueRatio < 0.35;
}

export function extractVolumeLiters(text: string): number | null {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:л|l|литр)/i);
  if (!match) return null;
  return Number.parseFloat(match[1]!.replace(",", "."));
}

export function hashContent(parts: string[]): string {
  let hash = 0;
  const joined = parts.join("|");
  for (let i = 0; i < joined.length; i += 1) {
    hash = (hash * 31 + joined.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

export function weightedAverage(
  entries: Array<{ score: number; weight: number; confidence?: number }>,
): { score: number; confidence: number } {
  let weighted = 0;
  let weightSum = 0;
  let confWeighted = 0;
  for (const e of entries) {
    weighted += e.score * e.weight;
    weightSum += e.weight;
    confWeighted += (e.confidence ?? 0.7) * e.weight;
  }
  if (weightSum === 0) return { score: 0, confidence: 0.5 };
  return {
    score: clampScore(weighted / weightSum),
    confidence: clampConfidence(confWeighted / weightSum),
  };
}
