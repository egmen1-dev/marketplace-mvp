/**
 * Deterministic count / money grouping — no Intl (SSR/client #418).
 */

/** Group with NBSP: 10000 → «10 000» */
export function formatCount(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}
