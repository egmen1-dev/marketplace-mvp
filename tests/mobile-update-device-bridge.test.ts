import { describe, expect, it } from "vitest";

import { analyzeFailedPhaseDownload } from "@/lib/mobile/update-bridge-rc10.5/failed-phase-download";
import {
  RC10_5_DOWNLOAD_CALL_GRAPH,
  stepsThrowingBeforeHttp,
} from "@/lib/mobile/update-bridge-rc10.5/rc10.5-download-callgraph";
import {
  queryApkProxyEvents,
  resetApkProxyEventsForTests,
  logApkProxyRequestStarted,
} from "@/lib/mobile/apk-proxy-request-log";

describe("RC10.5 failed-phase download", () => {
  it("FAILED_PHASE_DOWNLOAD_SUPPORTED_BY_RC10_5 = BROKEN (handler reachable, UX broken)", () => {
    const analysis = analyzeFailedPhaseDownload();
    expect(analysis.supported).toBe("BROKEN");
    expect(analysis.phaseGuardBlocksDownload).toBe(false);
    expect(analysis.setPhaseDownloadingOnTap).toBe(false);
  });

  it("lists pre-HTTP throw sites before File.downloadFileAsync", () => {
    const preHttp = stepsThrowingBeforeHttp();
    expect(preHttp.some((s) => s.symbol.includes("findVerifiedCachedApk"))).toBe(true);
    expect(preHttp.some((s) => s.symbol.includes("guards"))).toBe(true);
    const httpStep = RC10_5_DOWNLOAD_CALL_GRAPH.find((s) => s.symbol.includes("downloadFileAsync"));
    expect(httpStep?.order).toBe(12);
  });
});

describe("apk proxy request log", () => {
  it("records sanitized probe events", () => {
    resetApkProxyEventsForTests();
    logApkProxyRequestStarted({
      requestId: "abc123",
      versionCode: 23,
      method: "GET",
      userAgent: "okhttp/4.12.0",
      rangeHeader: null,
    });
    const events = queryApkProxyEvents({ versionCode: 23 });
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("request_started");
  });
});
