import { describe, expect, it } from "vitest";

import { classifyFetchFailure } from "@/apps/mobile/src/boot/classify-fetch-error";
import { formatBootReportSummary, type StartupBootReport } from "@/apps/mobile/src/boot/boot-report";
import { BootTimeoutError } from "@/apps/mobile/src/boot/with-timeout";

describe("mobile bootstrap diagnostics", () => {
  it("classifies timeout, ssl, dns, and network failures", () => {
    expect(classifyFetchFailure(new BootTimeoutError("bootstrap", 8000)).kind).toBe("timeout");
    expect(classifyFetchFailure(new Error("SSL handshake failed")).kind).toBe("ssl");
    expect(classifyFetchFailure(new Error("Unable to resolve host railway.app")).kind).toBe("dns");
    expect(classifyFetchFailure(new Error("Network request failed")).kind).toBe("network");
    const httpErr = Object.assign(new Error("service unavailable"), { name: "ApiClientError", status: 503, code: "HTTP_ERROR" });
    expect(classifyFetchFailure(httpErr).kind).toBe("http");
  });

  it("formats boot report summary with failure details", () => {
    const report: StartupBootReport = {
      startedAt: Date.now(),
      currentStage: "bootstrap",
      failedStage: "bootstrap",
      env: {
        apiBaseUrl: "https://web-production-e56fb.up.railway.app",
        releaseChannel: "staging",
        appVersion: "0.1.6-beta.1",
        buildNumber: "4",
        betaChannel: "CLOSED_BETA",
        commitSha: "abc",
      },
      entries: [
        {
          ts: Date.now(),
          stage: "bootstrap",
          event: "request_fail",
          url: "https://web-production-e56fb.up.railway.app/api/mobile/bootstrap",
          status: 503,
          failureKind: "http",
          detail: "HTTP_ERROR: service unavailable",
          responseBody: '{"error":"down"}',
        },
      ],
    };
    const summary = formatBootReportSummary(report);
    expect(summary).toContain("bootstrap");
    expect(summary).toContain("web-production-e56fb.up.railway.app");
    expect(summary).toContain("503");
  });
});
