/** One valid tap = one accepted action attempt. */

export type OneTapGuard = {
  tryBegin: () => boolean;
  finish: () => void;
  isInFlight: () => boolean;
};

export function createOneTapGuard(): OneTapGuard {
  let inFlight = false;
  return {
    tryBegin() {
      if (inFlight) return false;
      inFlight = true;
      return true;
    },
    finish() {
      inFlight = false;
    },
    isInFlight() {
      return inFlight;
    },
  };
}

export function createClientActionId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}
