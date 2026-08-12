"use client";

import { useEffect } from "react";

import {
  logPageLoadError,
  logPageLoadStart,
  logPageLoadSuccess,
} from "@/lib/telemetry/page-load-client";
import { isEmbeddedWebViewClient } from "@/lib/webview/detect";

type Props = {
  route: string;
};

/** Client-side first-load telemetry + boot splash removal (no PII). */
export function PageLoadObserver({ route }: Props) {
  useEffect(() => {
    const webview = isEmbeddedWebViewClient();
    logPageLoadStart({ route, webview });

    const splash = document.getElementById("boot-splash");
    splash?.remove();

    logPageLoadSuccess({
      route,
      webview,
      ms: Math.round(performance.now()),
    });

    const onError = (event: ErrorEvent) => {
      logPageLoadError({
        route,
        webview: isEmbeddedWebViewClient(),
        message: event.message?.slice(0, 200) ?? "unknown",
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason ?? "rejection");
      logPageLoadError({
        route,
        webview: isEmbeddedWebViewClient(),
        message: reason.slice(0, 200),
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [route]);

  return null;
}
