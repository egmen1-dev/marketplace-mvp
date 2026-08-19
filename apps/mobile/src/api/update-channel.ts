import { getBetaEnvironment } from "../beta/environment";

/** Channel sent to /api/mobile/update — matches EXPO_PUBLIC_BETA_CHANNEL (e.g. CLOSED_BETA). */
export function getMobileUpdateChannel(): string {
  return getBetaEnvironment().channel;
}
