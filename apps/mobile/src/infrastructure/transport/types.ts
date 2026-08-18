export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type TransportRequest = {
  readonly path: string;
  readonly method?: HttpMethod;
  readonly body?: unknown;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly retry?: boolean;
};

export type TransportTelemetryHook = {
  readonly onRequest?: (req: TransportRequest) => void;
  readonly onResponse?: (req: TransportRequest, durationMs: number) => void;
  readonly onError?: (req: TransportRequest, error: unknown, durationMs: number) => void;
};

export interface CommerceTransport {
  request<T>(req: TransportRequest): Promise<T>;
}
