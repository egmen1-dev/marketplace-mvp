import { BootTimeoutError } from "./with-timeout";

export type RequestFailureKind =
  | "timeout"
  | "ssl"
  | "dns"
  | "network"
  | "http"
  | "parse"
  | "unknown";

export type ClassifiedFetchError = {
  kind: RequestFailureKind;
  message: string;
  name?: string;
  status?: number;
  code?: string;
};

export function classifyFetchFailure(err: unknown, url?: string): ClassifiedFetchError {
  if (err instanceof BootTimeoutError) {
    return { kind: "timeout", message: err.message, name: err.name };
  }

  if (
    err instanceof Error &&
    err.name === "ApiClientError" &&
    "status" in err &&
    typeof (err as { status?: number }).status === "number"
  ) {
    const apiErr = err as Error & { status: number; code?: string };
    return {
      kind: "http",
      message: apiErr.message,
      name: apiErr.name,
      status: apiErr.status,
      code: apiErr.code,
    };
  }

  if (err instanceof Error) {
    const message = err.message || err.name;
    const lower = message.toLowerCase();

    if (err.name === "AbortError" || lower.includes("aborted") || lower.includes("timed out")) {
      return { kind: "timeout", message, name: err.name };
    }
    if (
      lower.includes("ssl") ||
      lower.includes("certificate") ||
      lower.includes("cert path") ||
      lower.includes("handshake")
    ) {
      return { kind: "ssl", message, name: err.name };
    }
    if (lower.includes("unable to resolve host") || lower.includes("no address associated") || lower.includes("dns")) {
      return { kind: "dns", message, name: err.name };
    }
    if (
      lower.includes("network request failed") ||
      lower.includes("failed to fetch") ||
      lower.includes("network error") ||
      lower.includes("connection")
    ) {
      return { kind: "network", message, name: err.name };
    }

    return { kind: "unknown", message, name: err.name };
  }

  const fallback = typeof err === "string" ? err : "unknown_error";
  return { kind: "unknown", message: fallback, name: url ? `fetch:${url}` : undefined };
}
