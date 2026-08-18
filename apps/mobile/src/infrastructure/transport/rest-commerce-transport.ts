import { apiRequest } from "../../api/client";
import { mapApiErrorToDomain } from "../network/map-api-error";
import { DEFAULT_RETRY_POLICY, withRetry } from "../retry/retry-policy";
import type { CommerceTransport, TransportRequest, TransportTelemetryHook } from "./types";

export class RestCommerceTransport implements CommerceTransport {
  constructor(private readonly telemetry: TransportTelemetryHook = {}) {}

  async request<T>(req: TransportRequest): Promise<T> {
    const started = Date.now();
    this.telemetry.onRequest?.(req);

    const execute = async (): Promise<T> => {
      const init: RequestInit = {
        method: req.method ?? "GET",
        signal: req.signal,
      };
      if (req.body !== undefined) {
        init.body = JSON.stringify(req.body);
      }
      return apiRequest<T>(req.path, init, req.retry ?? true);
    };

    try {
      const result = await withRetry(
        execute,
        (error) => {
          const mapped = mapApiErrorToDomain(error);
          return mapped.retryable;
        },
        DEFAULT_RETRY_POLICY,
      );
      this.telemetry.onResponse?.(req, Date.now() - started);
      return result;
    } catch (error) {
      this.telemetry.onError?.(req, error, Date.now() - started);
      throw mapApiErrorToDomain(error);
    }
  }
}

let sharedTransport: RestCommerceTransport | null = null;

export function getRestCommerceTransport(): RestCommerceTransport {
  if (!sharedTransport) sharedTransport = new RestCommerceTransport();
  return sharedTransport;
}

export function resetRestCommerceTransportForTests(): void {
  sharedTransport = null;
}
