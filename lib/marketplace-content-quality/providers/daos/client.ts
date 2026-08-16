import type { DaosClientConfig, DaosCriticRequest, DaosCriticResponse } from "./types";

export class DaosQualityClient {
  constructor(private readonly config: DaosClientConfig) {}

  async evaluateCritics(request: DaosCriticRequest): Promise<DaosCriticResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.config.apiKey) headers.Authorization = `Bearer ${this.config.apiKey}`;

      const res = await fetch(`${this.config.baseUrl}/api/quality/critics/evaluate`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!res.ok) {
        return { ok: false, error: `DAOS HTTP ${res.status}` };
      }

      const data = (await res.json()) as DaosCriticResponse;
      return data.ok ? data : { ok: false, error: data.error ?? "DAOS invalid response" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "DAOS request failed";
      return { ok: false, error: message };
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createDaosClientFromEnv(): DaosQualityClient | null {
  const baseUrl = process.env.DAOS_QUALITY_API_URL?.trim();
  if (!baseUrl) return null;
  return new DaosQualityClient({
    baseUrl,
    apiKey: process.env.DAOS_QUALITY_API_KEY?.trim(),
    timeoutMs: Number.parseInt(process.env.DAOS_QUALITY_TIMEOUT_MS ?? "8000", 10),
  });
}
