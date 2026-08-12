/**
 * Normalize Russian text for taxonomy matching / aliases.
 */

const YO = /ё/g;

export function normalizeAlias(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(YO, "е")
    .replace(/[«»"'`]/g, "")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ");
}

export function tokenizeQuery(input: string): string[] {
  return normalizeAlias(input)
    .split(/[\s,/()+]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/** Lightweight RU stem: strip common endings for prefix matching. */
export function stemToken(token: string): string {
  const t = normalizeAlias(token);
  if (t.length < 4) return t;
  const endings = [
    "ями",
    "ами",
    "иями",
    "ов",
    "ев",
    "ей",
    "ий",
    "ые",
    "ие",
    "ых",
    "их",
    "ая",
    "яя",
    "ое",
    "ее",
    "ую",
    "юю",
    "ом",
    "ем",
    "ам",
    "ям",
    "ах",
    "ях",
    "ы",
    "и",
    "а",
    "я",
    "у",
    "ю",
    "е",
    "о",
  ];
  for (const end of endings) {
    if (t.length - end.length >= 3 && t.endsWith(end)) {
      return t.slice(0, -end.length);
    }
  }
  return t.slice(0, Math.max(3, t.length - 1));
}

export function slugifyRu(input: string): string {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };
  return normalizeAlias(input)
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Map WB charcType → LOT CharacteristicType */
export function mapWbCharcType(charcType: number | undefined): import("./types").CharacteristicType {
  switch (charcType) {
    case 4:
      return "NUMBER";
    case 1:
      return "SELECT";
    case 0:
    default:
      return "TEXT";
  }
}

/** Refine type using Russian characteristic name (WB names are authoritative). */
export function inferCharacteristicTypeFromName(
  name: string,
  baseType: import("./types").CharacteristicType,
): import("./types").CharacteristicType {
  const n = normalizeAlias(name);
  if (n === "цвет" || n.startsWith("цвет ") || n.endsWith(" цвет")) {
    return "COLOR";
  }
  if (
    (n.includes("размер") || n.includes("size")) &&
    (baseType === "SELECT" || baseType === "TEXT")
  ) {
    return "SIZE";
  }
  return baseType;
}
