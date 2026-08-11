/**
 * Rate/burst detectors (AGENT-019, sections 6/8/23). Pure: given event timestamps
 * they flag rapid creation or repeated identical actions within a window.
 */

export type RateResult = {
  triggered: boolean;
  count: number;
  reason: string;
};

/** Rapid creation: N events within `windowMs`. */
export function detectRapidCreation(
  timestamps: number[],
  opts: { windowMs: number; threshold: number },
): RateResult {
  if (timestamps.length < opts.threshold) {
    return { triggered: false, count: timestamps.length, reason: "Норма" };
  }
  const sorted = [...timestamps].sort((a, b) => a - b);
  let maxInWindow = 0;
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j < sorted.length && sorted[j] - sorted[i] <= opts.windowMs) j += 1;
    maxInWindow = Math.max(maxInWindow, j - i);
  }
  return {
    triggered: maxInWindow >= opts.threshold,
    count: maxInWindow,
    reason:
      maxInWindow >= opts.threshold
        ? `${maxInWindow} операций за ${Math.round(opts.windowMs / 60000)} мин`
        : "Норма",
  };
}

/** Repeated identical messages (chat spam, section 23) — content-minimal. */
export function detectRepeatedMessages(
  messages: string[],
  opts: { threshold: number },
): RateResult {
  const counts = new Map<string, number>();
  for (const m of messages) {
    const key = m.trim().toLowerCase().slice(0, 200);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let max = 0;
  for (const c of counts.values()) max = Math.max(max, c);
  return {
    triggered: max >= opts.threshold,
    count: max,
    reason: max >= opts.threshold ? `Повтор одинаковых сообщений: ${max}` : "Норма",
  };
}
