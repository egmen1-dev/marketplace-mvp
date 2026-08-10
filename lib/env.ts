import { z } from "zod";

/**
 * Server-side environment schema.
 * Validated lazily so the app can build without every secret present.
 * Call `getEnv()` only from server code that needs these values.
 *
 * AUTH_SECRET is always required when `getEnv()` runs. In production
 * (NODE_ENV=production or common PaaS markers) a missing value fails loudly.
 * Never log AUTH_SECRET or other secrets.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Auth.js (NextAuth v5) — required
  AUTH_SECRET: z
    .string()
    .min(1, "AUTH_SECRET is required (openssl rand -base64 32)"),

  // Stripe (Checkout Sessions — optional; build works without keys)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // CDEK delivery (optional — mock used when empty)
  CDEK_CLIENT_ID: z.string().optional(),
  CDEK_CLIENT_SECRET: z.string().optional(),
  CDEK_API_URL: z.string().url().optional(),
  /** Optional CDEK city code for warehouse / from-location (e.g. 44 = Moscow). */
  CDEK_FROM_CITY_CODE: z.string().optional(),

  // Object storage (Vercel Blob today; see STORAGE_PROVIDER)
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  STORAGE_PROVIDER: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** True on any production host (Vercel, Render, Railway, bare Node, …). */
function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    process.env.RENDER === "true" ||
    Boolean(process.env.RAILWAY_ENVIRONMENT)
  );
}

export function getEnv(): Env {
  if (cached) return cached;

  const authSecret = process.env.AUTH_SECRET?.trim();

  if (!authSecret) {
    const where = isProductionRuntime() ? "production" : "local";
    throw new Error(
      `AUTH_SECRET is required (${where}). Set AUTH_SECRET in the environment (e.g. openssl rand -base64 32).`,
    );
  }

  const parsed = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    AUTH_SECRET: authSecret,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    CDEK_CLIENT_ID: process.env.CDEK_CLIENT_ID,
    CDEK_CLIENT_SECRET: process.env.CDEK_CLIENT_SECRET,
    CDEK_API_URL: process.env.CDEK_API_URL,
    CDEK_FROM_CITY_CODE: process.env.CDEK_FROM_CITY_CODE,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables:\n${parsed.error.issues
        .map((i) => `- ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`,
    );
  }

  cached = parsed.data;
  return cached;
}

/** Reset cached env (tests only). */
export function __resetEnvCacheForTests(): void {
  cached = null;
}

/**
 * Canonical public app origin (no trailing slash).
 * Prefer explicit app/auth URLs, then common PaaS-provided host vars
 * (Render / Railway / Vercel). Host-agnostic — no hard dependency on Vercel.
 */
export function getCanonicalAppUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    try {
      const withProtocol = trimmed.startsWith("http")
        ? trimmed
        : `https://${trimmed}`;
      const url = new URL(withProtocol);
      return url.origin;
    } catch {
      continue;
    }
  }

  return "http://localhost:3000";
}

/** Public (client-safe) config — no secrets. */
export const publicEnv = {
  appUrl: getCanonicalAppUrl(),
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
} as const;
