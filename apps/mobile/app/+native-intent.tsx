import { isExternalWebUrl, isLotDeepLink } from "../src/deep-links/is-app-deep-link";
import { mapWebPathToNativeHref } from "../src/deep-links/native-route-map";

/**
 * Blocks expo-router from handing staging/production https URLs to Linking.openURL.
 * Only lot:// deep links and mapped web paths become in-app routes.
 */
export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string | null {
  try {
    const trimmed = path.trim();
    if (!trimmed) return initial ? "/" : null;

    if (isLotDeepLink(trimmed)) return trimmed;

    if (isExternalWebUrl(trimmed)) {
      const nativeHref = mapWebPathToNativeHref(trimmed);
      if (nativeHref) return nativeHref;
      return initial ? "/" : null;
    }

    if (trimmed.startsWith("/")) return trimmed;
    return trimmed;
  } catch {
    return initial ? "/" : null;
  }
}
