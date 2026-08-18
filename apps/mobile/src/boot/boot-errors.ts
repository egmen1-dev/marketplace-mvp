import { ApiClientError } from "../api/client";
import {
  BootApiError,
  bootFailureCode,
  bootFailureMessage,
  bootPipelineHungFailure,
  parseBootFailure as parseBootFailureBase,
  BootTimeoutError,
} from "../../../../lib/mobile/boot/errors";

export {
  BootTimeoutError,
  bootFailureCode,
  bootFailureMessage,
  bootPipelineHungFailure,
} from "../../../../lib/mobile/boot/errors";

export function parseBootFailure(
  stage: Parameters<typeof parseBootFailureBase>[0],
  err: unknown,
  durationMs: number,
) {
  if (err instanceof ApiClientError) {
    return parseBootFailureBase(
      stage,
      new BootApiError(err.code, err.message, err.retryable, err.status),
      durationMs,
    );
  }
  return parseBootFailureBase(stage, err, durationMs);
}
