import { createMockCdekProvider } from "./mock-cdek";
import { DeliveryError, type DeliveryProvider } from "./provider";
import type {
  DeliveryQuote,
  DeliveryQuoteRequest,
  PickupPoint,
} from "./types";

type CdekConfig = {
  clientId: string;
  clientSecret: string;
  apiUrl: string;
  fromCityCode?: string;
};

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

/**
 * Thin real CDEK v2 client.
 *
 * Implements OAuth + cities / delivery points / tariff calculator.
 * On any failure (network, auth, unexpected payload) falls back to mock
 * so checkout never breaks. Prefer completing mock + this stub over a
 * half-broken live integration.
 *
 * Docs: https://api-docs.cdek.ru/
 */
export function createRealCdekProvider(config: CdekConfig): DeliveryProvider {
  const mock = createMockCdekProvider();
  const baseUrl = config.apiUrl.replace(/\/$/, "");
  let tokenCache: TokenCache | null = null;

  async function getAccessToken(): Promise<string> {
    if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
      return tokenCache.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const res = await fetch(`${baseUrl}/oauth/token?${body.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!res.ok) {
      throw new DeliveryError(
        "API_ERROR",
        `CDEK OAuth failed: ${res.status}`,
        502,
      );
    }

    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!data.access_token) {
      throw new DeliveryError("API_ERROR", "CDEK OAuth: no access_token", 502);
    }

    tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return data.access_token;
  }

  async function cdekFetch<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const token = await getAccessToken();
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new DeliveryError(
        "API_ERROR",
        `CDEK ${path}: ${res.status} ${text.slice(0, 200)}`,
        502,
      );
    }
    return (await res.json()) as T;
  }

  async function resolveCityCode(city: string): Promise<number | null> {
    const q = encodeURIComponent(city.trim());
    const data = await cdekFetch<
      Array<{ code?: number; city?: string }> | { cities?: Array<{ code?: number }> }
    >(`/location/cities?city=${q}&size=5`);

    const list = Array.isArray(data)
      ? data
      : Array.isArray(data.cities)
        ? data.cities
        : [];
    const first = list[0];
    return first?.code ?? null;
  }

  return {
    name: "cdek-real",

    async listPickupPoints(city: string): Promise<PickupPoint[]> {
      try {
        const cityCode = await resolveCityCode(city);
        if (cityCode == null) {
          return mock.listPickupPoints(city);
        }

        const data = await cdekFetch<
          | Array<{
              code?: string;
              name?: string;
              location?: {
                address?: string;
                city?: string;
                postal_code?: string;
                latitude?: number;
                longitude?: number;
              };
              work_time?: string;
            }>
          | { deliverypoints?: unknown[] }
        >(`/deliverypoints?city_code=${cityCode}&type=PVZ`);

        const raw = Array.isArray(data)
          ? data
          : Array.isArray((data as { deliverypoints?: unknown[] }).deliverypoints)
            ? ((data as { deliverypoints: unknown[] }).deliverypoints as Array<{
                code?: string;
                name?: string;
                location?: {
                  address?: string;
                  city?: string;
                  postal_code?: string;
                  latitude?: number;
                  longitude?: number;
                };
                work_time?: string;
              }>)
            : [];

        const points: PickupPoint[] = raw
          .filter((p) => p.code && (p.location?.address || p.name))
          .map((p) => ({
            code: String(p.code),
            name: p.name ?? `СДЭК ${p.code}`,
            address: p.location?.address ?? "",
            city: p.location?.city ?? city.trim(),
            postalCode: p.location?.postal_code,
            workTime: p.work_time,
            location:
              p.location?.latitude != null && p.location?.longitude != null
                ? { lat: p.location.latitude, lon: p.location.longitude }
                : undefined,
          }));

        if (points.length === 0) {
          return mock.listPickupPoints(city);
        }
        return points;
      } catch (err) {
        console.warn("[cdek-real] listPickupPoints fallback to mock", err);
        return mock.listPickupPoints(city);
      }
    },

    async getQuote(request: DeliveryQuoteRequest): Promise<DeliveryQuote> {
      try {
        const toCode = await resolveCityCode(request.city);
        if (toCode == null) {
          return mock.getQuote(request);
        }

        const fromCode = config.fromCityCode
          ? Number(config.fromCityCode)
          : 44; // Moscow default warehouse

        // 136 = warehouse→door (courier), 138 = warehouse→warehouse (PVZ)
        const tariffCode = request.method === "COURIER" ? 136 : 138;
        const weight = request.weightGrams ?? 1000;
        const length = request.lengthCm ?? 20;
        const width = request.widthCm ?? 15;
        const height = request.heightCm ?? 10;

        const calc = await cdekFetch<{
          delivery_sum?: number;
          period_min?: number;
          period_max?: number;
          errors?: unknown;
        }>("/calculator/tariff", {
          method: "POST",
          body: JSON.stringify({
            tariff_code: tariffCode,
            from_location: { code: fromCode },
            to_location: { code: toCode },
            packages: [{ weight, length, width, height }],
          }),
        });

        if (calc.delivery_sum == null) {
          return mock.getQuote(request);
        }

        const quote: DeliveryQuote = {
          method: request.method,
          city: request.city.trim(),
          cost: Math.round(calc.delivery_sum),
          currency: "RUB",
          estimatedMinDays: calc.period_min ?? 3,
          estimatedMaxDays: calc.period_max ?? (calc.period_min ?? 3) + 2,
          provider: "CDEK",
          source: "real",
          pickupPointCode: request.pickupPointCode,
        };
        return quote;
      } catch (err) {
        console.warn("[cdek-real] getQuote fallback to mock", err);
        return mock.getQuote(request);
      }
    },
  };
}
