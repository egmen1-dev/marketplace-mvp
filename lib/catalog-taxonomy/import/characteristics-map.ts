/**
 * Characteristic mapping — WB / source names → LOT CharacteristicDefinition.
 */

import { normalizeAlias, stemToken } from "../normalize";
import { canonicalizeCharacteristicName } from "./normalize";

export type CharDefLite = {
  id: string;
  name: string;
  slug: string;
  type: string;
};

export type CharacteristicMapping = {
  incomingName: string;
  incomingSlug: string;
  targetId: string | null;
  targetName: string | null;
  targetSlug: string | null;
  confidence: number;
  kind: "exact_slug" | "exact_name" | "alias" | "similar" | "unmapped";
};

export function mapCharacteristicToDefinition(
  incoming: { name: string; slug: string },
  definitions: CharDefLite[],
): CharacteristicMapping {
  const canon = canonicalizeCharacteristicName(incoming.name);
  const inSlug = normalizeAlias(incoming.slug || canon.slugHint);
  const inName = normalizeAlias(incoming.name);

  for (const d of definitions) {
    if (normalizeAlias(d.slug) === inSlug) {
      return {
        incomingName: incoming.name,
        incomingSlug: incoming.slug,
        targetId: d.id,
        targetName: d.name,
        targetSlug: d.slug,
        confidence: 0.98,
        kind: "exact_slug",
      };
    }
  }

  for (const d of definitions) {
    if (normalizeAlias(d.name) === inName) {
      return {
        incomingName: incoming.name,
        incomingSlug: incoming.slug,
        targetId: d.id,
        targetName: d.name,
        targetSlug: d.slug,
        confidence: 0.95,
        kind: "exact_name",
      };
    }
  }

  // Alias dictionary (мощность двигателя → power)
  for (const d of definitions) {
    const dSlug = normalizeAlias(d.slug);
    if (
      dSlug.includes(normalizeAlias(canon.slugHint)) ||
      normalizeAlias(canon.slugHint).includes(dSlug.slice(0, 5))
    ) {
      return {
        incomingName: incoming.name,
        incomingSlug: incoming.slug,
        targetId: d.id,
        targetName: d.name,
        targetSlug: d.slug,
        confidence: 0.88,
        kind: "alias",
      };
    }
  }

  const inStem = stemToken(inName);
  for (const d of definitions) {
    const dStem = stemToken(normalizeAlias(d.name));
    if (inStem.length >= 4 && (inStem === dStem || inStem.startsWith(dStem) || dStem.startsWith(inStem))) {
      return {
        incomingName: incoming.name,
        incomingSlug: incoming.slug,
        targetId: d.id,
        targetName: d.name,
        targetSlug: d.slug,
        confidence: 0.72,
        kind: "similar",
      };
    }
  }

  return {
    incomingName: incoming.name,
    incomingSlug: incoming.slug,
    targetId: null,
    targetName: null,
    targetSlug: null,
    confidence: 0.35,
    kind: "unmapped",
  };
}
