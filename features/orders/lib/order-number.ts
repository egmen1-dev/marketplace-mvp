/** Human-readable unique-ish order number, e.g. LOT-20260806-A3F9 */
export function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LOT-${y}${m}${d}-${rand}`;
}
