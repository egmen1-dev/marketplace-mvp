/**
 * Brand & model extraction — rule-based (LLM-ready interface).
 */

import { normalizeAlias, slugifyRu } from "@/lib/catalog-taxonomy/normalize";

import { toFieldConfidence, type FieldConfidence } from "./types";

/** Seed dictionary — not a full brand catalog; expand via Brand table later. */
export const KNOWN_BRANDS: Array<{ name: string; aliases: string[] }> = [
  { name: "Makita", aliases: ["макита"] },
  { name: "Bosch", aliases: ["бош"] },
  { name: "DeWalt", aliases: ["деволт", "dewolt"] },
  { name: "Metabo", aliases: ["метабо"] },
  { name: "Hilti", aliases: ["хилти"] },
  { name: "Ballu", aliases: ["баллу"] },
  { name: "Apple", aliases: ["эппл"] },
  { name: "Samsung", aliases: ["самсунг"] },
  { name: "Xiaomi", aliases: ["сяоми"] },
  { name: "Huawei", aliases: ["хуавей"] },
  { name: "Lenovo", aliases: ["леново"] },
  { name: "ASUS", aliases: ["асус"] },
  { name: "HP", aliases: ["hewlett", "hewlett-packard"] },
  { name: "Dell", aliases: ["делл"] },
  { name: "Sony", aliases: ["сони"] },
  { name: "LG", aliases: [] },
  { name: "Philips", aliases: ["филипс"] },
  { name: "Siemens", aliases: ["сименс"] },
  { name: "Interskol", aliases: ["интерскол"] },
  { name: "Zubr", aliases: ["зубр"] },
];

export type BrandHit = {
  name: string;
  slug: string;
  confidence: FieldConfidence;
  matchedAlias: string;
};

export function extractBrand(title: string): BrandHit | null {
  const hay = normalizeAlias(title);
  if (!hay) return null;

  let best: BrandHit | null = null;

  for (const b of KNOWN_BRANDS) {
    const candidates = [b.name, ...b.aliases].map((a) => normalizeAlias(a));
    for (const alias of candidates) {
      if (!alias || alias.length < 2) continue;
      const re = new RegExp(
        `(^|[^\\p{L}\\p{N}])${escapeRe(alias)}([^\\p{L}\\p{N}]|$)`,
        "iu",
      );
      if (re.test(hay) || hay.includes(alias)) {
        const score = alias.length >= 5 ? 0.92 : 0.82;
        const hit: BrandHit = {
          name: b.name,
          slug: slugifyRu(b.name),
          confidence: toFieldConfidence(score),
          matchedAlias: alias,
        };
        if (!best || hit.confidence.score > best.confidence.score) best = hit;
      }
    }
  }

  return best;
}

/**
 * Model codes: HR2470, GSR 120, iPhone 15 Pro, SDS-plus kept out.
 * Prefer tokens after brand or standalone alnum patterns.
 */
export function extractModel(
  title: string,
  brandName?: string | null,
): { name: string; confidence: FieldConfidence } | null {
  const raw = title.trim();
  if (!raw) return null;

  // Phone-like first (avoid SKU regex eating "Pro 256")
  const phone = raw.match(
    /\b(iPhone\s+\d{1,2}(?:\s+(?:Pro|Plus|Max|mini))?|Galaxy\s+[A-Z]?\d{1,2}\w*)\b/i,
  );
  if (phone) {
    return {
      name: phone[1].replace(/\s+/g, " ").trim(),
      confidence: toFieldConfidence(0.85),
    };
  }

  // Classic tool SKUs: letters + digits (HR2470, GSR120, DCD777)
  const sku = raw.match(/\b([A-Z]{2,5}[- ]?\d{2,5}[A-Z0-9]*)\b/i);
  if (sku) {
    const name = sku[1].replace(/\s+/g, " ").toUpperCase().replace(/ /g, "");
    if (!/^(PRO|MAX|PLUS|MINI)\d/i.test(name)) {
      return { name, confidence: toFieldConfidence(0.88) };
    }
  }

  if (brandName) {
    const after = raw.split(new RegExp(escapeRe(brandName), "i"))[1];
    if (after) {
      const token = after.trim().split(/[\s,|/]+/)[0];
      if (token && /[A-Za-z0-9]/.test(token) && token.length >= 3 && token.length <= 24) {
        if (!/^\d+(вт|w|квт|kw)?$/i.test(token)) {
          return {
            name: token,
            confidence: toFieldConfidence(0.55),
          };
        }
      }
    }
  }

  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
