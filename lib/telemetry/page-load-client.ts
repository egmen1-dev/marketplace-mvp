import type { PageLoadPayload } from "@/lib/telemetry/page-load-types";

function send(payload: PageLoadPayload): void {
  const body = JSON.stringify(payload);

  void fetch("/api/telemetry/page-load", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    /* telemetry must not break UX */
  });
}

export function logPageLoadStart(fields: Omit<PageLoadPayload, "event">): void {
  if (typeof window === "undefined") return;
  send({ event: "page_load_start", ...fields });
}

export function logPageLoadSuccess(fields: Omit<PageLoadPayload, "event">): void {
  if (typeof window === "undefined") return;
  send({ event: "page_load_success", ...fields });
}

export function logPageLoadError(
  fields: Omit<PageLoadPayload, "event"> & { message: string },
): void {
  if (typeof window === "undefined") return;
  send({ event: "page_load_error", ...fields });
}
