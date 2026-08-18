import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect } from "react";

import { routeDeepLink } from "../deep-links/route-deep-link";
import { useAppStore } from "../store/app-store";

/** Deferred until post-bootstrap to avoid SecureStore TurboModule at layout mount. */
export function useDeepLinkHandler(enabled: boolean) {
  const setPendingDeepLink = useAppStore((s) => s.setPendingDeepLink);

  useEffect(() => {
    if (!enabled) return;

    async function handle(url: string | null) {
      if (!url) return;
      const { getAccessToken } = await import("../storage/secure-session");
      const token = await getAccessToken();
      if (!token) {
        setPendingDeepLink(url);
        router.replace("/login");
        return;
      }
      routeDeepLink(url);
    }

    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener("url", (event) => handle(event.url));
    return () => sub.remove();
  }, [enabled, setPendingDeepLink]);
}
