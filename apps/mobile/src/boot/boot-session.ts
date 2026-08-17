import { generateBootId } from "../../../../lib/mobile/diagnostics/boot-id";

let currentBootId = generateBootId();
let retryCount = 0;

export function beginBootSession(isRetry: boolean): { bootId: string; retryCount: number } {
  if (isRetry) {
    retryCount += 1;
  } else {
    currentBootId = generateBootId();
    retryCount = 0;
  }
  return { bootId: currentBootId, retryCount };
}

export function getCurrentBootId(): string {
  return currentBootId;
}

export function getCurrentRetryCount(): number {
  return retryCount;
}
