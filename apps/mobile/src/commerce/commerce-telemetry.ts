import { router } from "expo-router";

import { postTelemetry } from "../api/endpoints";
import { ApiClientError } from "../api/client";
import { getBuildInfo } from "../beta/build-info";

export type CommerceAction = "add_to_cart" | "toggle_favorite";

export async function trackCommerceAction(input: {
  action: CommerceAction;
  productId: string;
  endpoint: string;
  startedAt: number;
  success: boolean;
  error?: unknown;
}): Promise<void> {
  const build = getBuildInfo();
  const err = input.error;
  const apiErr = err instanceof ApiClientError ? err : null;
  await postTelemetry({
    screen: "commerce",
    event: "MOBILE_COMMERCE_ACTION",
    errorCode: apiErr?.code,
    metadata: {
      action: input.action,
      productId: input.productId,
      endpoint: input.endpoint,
      status: apiErr?.status ?? (input.success ? 200 : 0),
      durationMs: Date.now() - input.startedAt,
      success: input.success,
      errorClass: err instanceof Error ? err.constructor.name : err ? typeof err : null,
      appVersion: build.appVersion,
      versionCode: build.buildNumber,
      commitSha: build.commitSha,
    },
  });
}

export function handleCommerceAuthFailure(err: unknown): boolean {
  if (err instanceof ApiClientError && (err.status === 401 || err.code === "UNAUTHORIZED")) {
    router.push("/login");
    return true;
  }
  return false;
}
