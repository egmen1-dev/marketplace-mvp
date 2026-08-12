/** Cookie keys — no PII. First-touch UTM + anonymous visitor id. */
export const VISITOR_COOKIE = "lot_vid";
export const UTM_COOKIE = "lot_utm";
export const ATTRIBUTION_MAX_AGE_DAYS = 30;

export type UtmAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
};

export type AnalyticsAttribution = UtmAttribution & {
  visitorId?: string;
};

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
] as const;

export function parseUtmFromSearch(search: string): UtmAttribution | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const source = params.get("utm_source")?.trim();
  const medium = params.get("utm_medium")?.trim();
  const campaign = params.get("utm_campaign")?.trim();
  const content = params.get("utm_content")?.trim();

  if (!source && !medium && !campaign && !content) return null;

  return {
    ...(source ? { utmSource: source.slice(0, 100) } : {}),
    ...(medium ? { utmMedium: medium.slice(0, 100) } : {}),
    ...(campaign ? { utmCampaign: campaign.slice(0, 100) } : {}),
    ...(content ? { utmContent: content.slice(0, 100) } : {}),
  };
}

export function serializeUtmCookie(utm: UtmAttribution): string {
  return encodeURIComponent(JSON.stringify(utm));
}

export function parseUtmCookie(raw: string | undefined): UtmAttribution | null {
  if (!raw) return null;
  try {
    const json = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const out: UtmAttribution = {};
    if (typeof json.utmSource === "string") out.utmSource = json.utmSource.slice(0, 100);
    if (typeof json.utmMedium === "string") out.utmMedium = json.utmMedium.slice(0, 100);
    if (typeof json.utmCampaign === "string") out.utmCampaign = json.utmCampaign.slice(0, 100);
    if (typeof json.utmContent === "string") out.utmContent = json.utmContent.slice(0, 100);
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

export function cookieMaxAgeSec(): number {
  return ATTRIBUTION_MAX_AGE_DAYS * 24 * 60 * 60;
}

export function hasUtmParams(search: string): boolean {
  return UTM_KEYS.some((k) => new URLSearchParams(search).has(k));
}
