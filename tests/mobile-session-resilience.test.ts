import { describe, expect, it } from "vitest";

import { parseApiError } from "@/apps/mobile/src/api/errors";
import { isTransientFetchFailure, withBootRetry } from "@/apps/mobile/src/boot/retry-fetch";
import { classifyFetchFailure } from "@/apps/mobile/src/boot/classify-fetch-error";

describe("mobile session resilience", () => {
  it("parses flat auth error codes from refresh endpoint", async () => {
    const res = new Response(JSON.stringify({ error: "REFRESH_REVOKED", message: "Session revoked" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
    const err = await parseApiError(res);
    expect(err.code).toBe("REFRESH_REVOKED");
    expect(err.message).toBe("Session revoked");
  });

  it("parses nested mobile API errors", async () => {
    const res = new Response(
      JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Token expired", retryable: false } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
    const err = await parseApiError(res);
    expect(err.code).toBe("UNAUTHORIZED");
  });

  it("classifies DNS failures as transient", () => {
    expect(
      isTransientFetchFailure(new Error('Unable to resolve host "web-production-e56fb.up.railway.app"')),
    ).toBe(true);
    expect(classifyFetchFailure(new Error("Unable to resolve host railway.app")).kind).toBe("dns");
  });

  it("does not treat HTTP 401 as transient", () => {
    const err = Object.assign(new Error("unauthorized"), { name: "ApiClientError", status: 401, code: "UNAUTHORIZED" });
    expect(isTransientFetchFailure(err)).toBe(false);
  });

  it("retries transient failures and eventually succeeds", async () => {
    let calls = 0;
    const result = await withBootRetry("test", async () => {
      calls += 1;
      if (calls < 3) throw new Error("Network request failed");
      return "ok";
    }, { attempts: 3, baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("does not retry non-transient HTTP 400", async () => {
    let calls = 0;
    const err = Object.assign(new Error("bad request"), { name: "ApiClientError", status: 400, code: "VALIDATION_ERROR" });
    await expect(
      withBootRetry("test", async () => {
        calls += 1;
        throw err;
      }, { attempts: 3, baseDelayMs: 1 }),
    ).rejects.toThrow("bad request");
    expect(calls).toBe(1);
  });
});
