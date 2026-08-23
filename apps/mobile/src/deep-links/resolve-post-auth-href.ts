import { isLotDeepLink } from "./is-app-deep-link";
import { mapLotDeepLinkToHref, mapWebPathToNativeHref } from "./native-route-map";

export type PostAuthDestination = {
  type?: string;
  webPath?: string;
  productId?: string;
} | null;

function isSellerRole(role: string): boolean {
  return role === "SELLER" || role === "ADMIN";
}

function defaultHomeHref(_role: string): string {
  return "/(tabs)";
}

/**
 * Always returns a native Expo Router path — never an external https URL.
 */
export function resolvePostAuthHref(input: {
  role: string;
  pendingDeepLink?: string | null;
  destination?: PostAuthDestination;
}): string {
  const pending = input.pendingDeepLink?.trim();
  if (pending && isLotDeepLink(pending)) {
    const fromLot = mapLotDeepLinkToHref(pending);
    if (fromLot) return fromLot;
  }

  const webPath = input.destination?.webPath?.trim();
  if (webPath) {
    const fromWeb = mapWebPathToNativeHref(webPath);
    if (fromWeb) return fromWeb;
  }

  return defaultHomeHref(input.role);
}
