import { describe, expect, it } from "vitest";

import { generateBootId, isBootId } from "@/lib/mobile/diagnostics/boot-id";
import { formatDiagnosticsJson, formatDiagnosticsText, redactSecrets } from "@/lib/mobile/diagnostics/format-report";
import { getBootFailurePresentation } from "@/lib/mobile/diagnostics/types";
import { BootApiError, parseBootFailure } from "@/lib/mobile/boot/errors";
import { BootStage } from "@/lib/mobile/boot/types";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("EPIC-84 P1 crash diagnostics platform", () => {
  it("generates valid boot ids", () => {
    const id = generateBootId();
    expect(isBootId(id)).toBe(true);
    expect(id.startsWith("BOOT-")).toBe(true);
  });

  it("formats human-readable diagnostics", () => {
    const text = formatDiagnosticsText({
      bootId: "BOOT-ABCDEF",
      app: { version: "0.1.2-alpha", versionCode: 3, commit: "abc", environment: "staging" },
      device: { manufacturer: "Xiaomi", model: "13", androidVersion: "15", sdk: 35, locale: "ru-RU" },
      network: { type: "LTE", reachable: true },
      boot: { bootId: "BOOT-ABCDEF", stage: "Bootstrap", durationMs: 100, retryCount: 0 },
      error: { code: "bootstrap_network", message: "Network unavailable" },
      time: "2026-08-17T01:14:00.000Z",
    });
    expect(text).toContain("LOT Diagnostics");
    expect(text).toContain("BOOT-ABCDEF");
  });

  it("redacts bearer tokens from diagnostics", () => {
    expect(redactSecrets("Authorization Bearer secret-token")).toContain("[REDACTED]");
  });

  it("maps offline failures to user copy", () => {
    const presentation = getBootFailurePresentation(
      parseBootFailure(BootStage.BOOTSTRAP, new TypeError("Network request failed"), 50),
    );
    expect(presentation.title).toContain("Интернет");
  });

  it("maps server failures to service unavailable copy", () => {
    const presentation = getBootFailurePresentation(
      parseBootFailure(BootStage.BOOTSTRAP, new BootApiError("HTTP_ERROR", "error", true, 500), 50),
    );
    expect(presentation.title).toContain("Сервис временно недоступен");
  });

  it("includes copy and export actions on startup error screen", () => {
    const source = readFileSync(join(process.cwd(), "apps/mobile/src/features/startup/StartupErrorScreen.tsx"), "utf8");
    expect(source).toContain("Скопировать диагностику");
    expect(source).toContain("Экспортировать отчёт");
    expect(source).toContain("Сообщить о проблеме");
  });

  it("exports diagnostics as json", () => {
    const json = formatDiagnosticsJson({
      bootId: "BOOT-123456",
      app: { version: "1", versionCode: 1, commit: "c", environment: "staging" },
      device: { manufacturer: "a", model: "b", androidVersion: "15", sdk: 35, locale: "ru" },
      network: { type: "wifi", reachable: true },
      boot: { bootId: "BOOT-123456", stage: "Bootstrap", durationMs: 1, retryCount: 0 },
      error: { code: "x", message: "y" },
      time: new Date().toISOString(),
    });
    expect(JSON.parse(json).bootId).toBe("BOOT-123456");
  });
});
