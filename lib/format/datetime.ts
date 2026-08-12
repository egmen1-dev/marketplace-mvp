/**
 * Deterministic Moscow datetime helpers for SSR + client hydration.
 * Avoid Intl / toLocale* — Node ICU vs Chromium can diverge (#418).
 */

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

const MONTHS_LONG = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

const MONTHS_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
] as const;

function moscowParts(iso: string | Date): {
  day: number;
  monthIdx: number;
  year: number;
  hour: string;
  minute: string;
} {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const m = new Date(d.getTime() + MSK_OFFSET_MS);
  return {
    day: m.getUTCDate(),
    monthIdx: m.getUTCMonth(),
    year: m.getUTCFullYear(),
    hour: String(m.getUTCHours()).padStart(2, "0"),
    minute: String(m.getUTCMinutes()).padStart(2, "0"),
  };
}

/** «11 августа 2026, 14:30» */
export function formatDateTimeMoscow(iso: string | Date): string {
  const p = moscowParts(iso);
  return `${p.day} ${MONTHS_LONG[p.monthIdx] ?? ""} ${p.year}, ${p.hour}:${p.minute}`;
}

/** «11 августа 2026» */
export function formatDateMoscow(iso: string | Date): string {
  const p = moscowParts(iso);
  return `${p.day} ${MONTHS_LONG[p.monthIdx] ?? ""} ${p.year}`;
}

/** «11 авг 2026» */
export function formatDateMoscowShort(iso: string | Date): string {
  const p = moscowParts(iso);
  return `${p.day} ${MONTHS_SHORT[p.monthIdx] ?? ""} ${p.year}`;
}

/** «11 авг» or «11 авг 14:30» */
export function formatChatStampMoscow(
  iso: string | Date,
  mode: "list" | "thread",
): string {
  const p = moscowParts(iso);
  if (mode === "thread") {
    return `${p.day} ${MONTHS_SHORT[p.monthIdx] ?? ""} ${p.hour}:${p.minute}`;
  }
  return `${p.day} ${MONTHS_SHORT[p.monthIdx] ?? ""}`;
}
