/**
 * Attribute extraction from free text → taxonomy characteristic candidates.
 */

import { normalizeAlias } from "@/lib/catalog-taxonomy/normalize";

import { toFieldConfidence, type SuggestedCharacteristic } from "./types";

type CharDef = {
  id: string;
  slug: string;
  name: string;
  type: string;
  unit: string | null;
};

/** Extract raw attributes from title/description. */
export function extractRawAttributes(
  title: string,
  description?: string | null,
): Array<{ label: string; slugHint: string; valueText?: string; valueNumber?: number }> {
  const text = `${title} ${description ?? ""}`;
  const out: Array<{
    label: string;
    slugHint: string;
    valueText?: string;
    valueNumber?: number;
  }> = [];

  const powerW = text.match(/(\d+(?:[.,]\d+)?)\s*(?:Вт|W)(?![а-яёa-z])/i);
  if (powerW) {
    out.push({
      label: "Мощность",
      slugHint: "power",
      valueNumber: Number(powerW[1].replace(",", ".")),
      valueText: `${powerW[1].replace(",", ".")} Вт`,
    });
  }

  const powerKw = text.match(/(\d+(?:[.,]\d+)?)\s*(?:кВт|kW)(?![а-яёa-z])/i);
  if (powerKw && !powerW) {
    out.push({
      label: "Мощность",
      slugHint: "power",
      valueNumber: Number(powerKw[1].replace(",", ".")),
      valueText: `${powerKw[1].replace(",", ".")} кВт`,
    });
  }

  const voltage = text.match(/(\d+)\s*В(?![а-яёa-zтТwW])/i);
  if (voltage) {
    const n = Number(voltage[1]);
    if (n === 12 || n === 18 || n === 20 || n === 220 || n === 380) {
      out.push({
        label: "Напряжение",
        slugHint: "voltage",
        valueNumber: n,
        valueText: String(n),
      });
    }
  }

  if (/\bSDS\+?\b/i.test(text) || /сдс/i.test(text)) {
    out.push({
      label: "Патрон",
      slugHint: "chuck",
      valueText: /SDS-?max/i.test(text) ? "SDS-max" : "SDS+",
    });
  }

  if (/ударн/i.test(text)) {
    out.push({
      label: "Ударный режим",
      slugHint: "impact",
      valueText: "true",
    });
  }

  return out;
}

/** Map extracted attributes onto ProductType characteristic definitions. */
export function mapAttributesToDefinitions(
  extracted: ReturnType<typeof extractRawAttributes>,
  definitions: CharDef[],
): SuggestedCharacteristic[] {
  const result: SuggestedCharacteristic[] = [];

  for (const attr of extracted) {
    const def = definitions.find((d) => {
      const slug = normalizeAlias(d.slug);
      const name = normalizeAlias(d.name);
      const hint = normalizeAlias(attr.slugHint);
      return (
        slug.includes(hint) ||
        hint.includes(slug.slice(0, 5)) ||
        name.includes(normalizeAlias(attr.label)) ||
        normalizeAlias(attr.label).includes(name.slice(0, 4))
      );
    });

    if (!def) {
      result.push({
        slug: attr.slugHint,
        name: attr.label,
        valueText: attr.valueText ?? null,
        valueNumber: attr.valueNumber ?? null,
        confidence: toFieldConfidence(0.4),
        extractedLabel: attr.label,
      });
      continue;
    }

    const isBool = def.type === "BOOLEAN";
    result.push({
      definitionId: def.id,
      slug: def.slug,
      name: def.name,
      valueText: isBool ? null : (attr.valueText ?? null),
      valueNumber:
        def.type === "NUMBER" ? (attr.valueNumber ?? null) : null,
      valueBoolean: isBool
        ? attr.valueText === "true" || attr.valueText === "1"
        : null,
      confidence: toFieldConfidence(0.8),
      extractedLabel: attr.label,
    });
  }

  return result;
}
