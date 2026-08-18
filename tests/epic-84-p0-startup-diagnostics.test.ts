import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  bootFailureCode,
  bootFailureMessage,
  bootPipelineHungFailure,
  parseBootFailure,
  BootTimeoutError,
} from "@/lib/mobile/boot/errors";
import { BootStage } from "@/lib/mobile/boot/types";
import { BOOT_STAGE_TIMEOUT_MS, BOOT_HARD_TIMEOUT_MS } from "@/lib/mobile/boot/timeouts";
import { decodeJwtPayload } from "@/lib/mobile/boot/jwt";

describe("EPIC-84 P0 startup diagnostics", () => {
  it("defines per-stage timeouts from spec", () => {
    expect(BOOT_STAGE_TIMEOUT_MS[BootStage.BOOTSTRAP]).toBe(8_000);
    expect(BOOT_STAGE_TIMEOUT_MS[BootStage.REMOTE_CONFIG]).toBe(8_000);
    expect(BOOT_STAGE_TIMEOUT_MS[BootStage.UPDATE]).toBe(5_000);
    expect(BOOT_STAGE_TIMEOUT_MS[BootStage.SESSION]).toBe(5_000);
    expect(BOOT_STAGE_TIMEOUT_MS[BootStage.NAVIGATION]).toBe(3_000);
    expect(BOOT_HARD_TIMEOUT_MS).toBeGreaterThanOrEqual(29_000);
  });

  it("maps failures to actionable codes and messages", () => {
    const failure = parseBootFailure(BootStage.REMOTE_CONFIG, new TypeError("Network request failed"), 120);
    expect(failure.stage).toBe(BootStage.REMOTE_CONFIG);
    expect(failure.code).toContain("network");
    expect(failure.message).toBe("Network unavailable");
    expect(failure.retryable).toBe(true);
  });

  it("detects session expired message", () => {
    expect(bootFailureMessage(BootStage.SESSION, new Error("session_expired"))).toBe("Session expired");
    expect(bootFailureCode(BootStage.SESSION, new Error("session_expired"))).toContain("session");
  });

  it("maps boot timeout to request timeout message", () => {
    const failure = parseBootFailure(
      BootStage.BOOTSTRAP,
      new BootTimeoutError("bootstrap", 8000),
      8000,
    );
    expect(failure.message).toBe("Request timeout");
    expect(failure.code).toBe("bootstrap_timeout");
  });

  it("decodes jwt exp when payload is valid base64 json", () => {
    const payload = { exp: Math.floor(Date.now() / 1000) + 3600, sub: "user-1" };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const token = `header.${encoded}.sig`;
    expect(decodeJwtPayload(token)?.sub).toBe("user-1");
  });

  it("never shows generic boot error without details in boot screen", () => {
    const index = readFileSync(join(process.cwd(), "apps/mobile/app/index.tsx"), "utf8");
    expect(index).not.toContain('"Не удалось загрузить приложение"');
    expect(index).toContain("StartupErrorScreen");
  });

  it("provides retryable hung pipeline failure", () => {
    const hung = bootPipelineHungFailure(30_000);
    expect(hung.retryable).toBe(true);
    expect(hung.message.length).toBeGreaterThan(10);
  });
});
