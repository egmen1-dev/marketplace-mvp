export function formatPrice(value: number | null | undefined, currency = "₽"): string {
  const amount = Number(value ?? 0);
  return `${amount.toLocaleString("ru-RU")} ${currency}`;
}

export function formatCompactNumber(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString("ru-RU");
}

export function resolveImageUrl(url: string | null | undefined, baseUrl: string): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${baseUrl}${url.startsWith("/") ? url : `/${url}`}`;
}
