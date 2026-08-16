/** Mobile API contract versioning — required for APK direct distribution foundation */

export const MOBILE_API_VERSION = "mobile-api-v1";
export const MOBILE_SCHEMA_VERSION = "mobile-schema-v1";

export type MobileApiEnvelope<T> = T & {
  apiVersion: typeof MOBILE_API_VERSION;
  schemaVersion: typeof MOBILE_SCHEMA_VERSION;
  syncVersion: string;
  advisoryOnly: true;
};

export function withMobileApiContract<T extends Record<string, unknown>>(
  payload: T,
  syncVersion: string,
): MobileApiEnvelope<T> {
  return {
    ...payload,
    apiVersion: MOBILE_API_VERSION,
    schemaVersion: MOBILE_SCHEMA_VERSION,
    syncVersion,
    advisoryOnly: true,
  };
}

export const MOBILE_ENV_CONFIG = {
  dev: { baseUrl: "http://localhost:3000", label: "dev" },
  staging: { baseUrl: "https://web-production-e56fb.up.railway.app", label: "staging" },
  prod: { baseUrl: "https://web-production-e56fb.up.railway.app", label: "prod" },
} as const;

/** Reserved deep-link scheme for future Android/iOS shell */
export const MOBILE_DEEP_LINK_SCHEME = "marketplace-mvp";

export type ApkUpdateMetadata = {
  minSupportedApiVersion: string;
  minSupportedSchemaVersion: string;
  recommendedApiVersion: string;
};

export const APK_UPDATE_METADATA: ApkUpdateMetadata = {
  minSupportedApiVersion: MOBILE_API_VERSION,
  minSupportedSchemaVersion: MOBILE_SCHEMA_VERSION,
  recommendedApiVersion: MOBILE_API_VERSION,
};
