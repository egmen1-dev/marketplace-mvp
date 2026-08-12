"use client";

import {
  ATTRIBUTION_MAX_AGE_DAYS,
  cookieMaxAgeSec,
  parseUtmCookie,
  parseUtmFromSearch,
  serializeUtmCookie,
  UTM_COOKIE,
  VISITOR_COOKIE,
  type AnalyticsAttribution,
  type UtmAttribution,
} from "@/lib/analytics/attribution";

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1];
}

function writeCookie(name: string, value: string): void {
  const maxAge = cookieMaxAgeSec();
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function newVisitorId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Ensure anonymous visitor id + first-touch UTM cookies exist. */
export function ensureAttributionCookies(search?: string): AnalyticsAttribution {
  let visitorId = readCookie(VISITOR_COOKIE);
  if (!visitorId) {
    visitorId = newVisitorId();
    writeCookie(VISITOR_COOKIE, visitorId);
  }

  const fromUrl = search != null ? parseUtmFromSearch(search) : null;
  const existing = parseUtmCookie(readCookie(UTM_COOKIE));

  let utm: UtmAttribution | null = existing;
  if (fromUrl && !existing) {
    writeCookie(UTM_COOKIE, serializeUtmCookie(fromUrl));
    utm = fromUrl;
  }

  return {
    visitorId,
    ...utm,
  };
}

/** Read attribution for event payloads (client only). */
export function getClientAttribution(): AnalyticsAttribution {
  const visitorId = readCookie(VISITOR_COOKIE);
  const utm = parseUtmCookie(readCookie(UTM_COOKIE));
  return { visitorId, ...utm };
}

export { ATTRIBUTION_MAX_AGE_DAYS, VISITOR_COOKIE, UTM_COOKIE };
