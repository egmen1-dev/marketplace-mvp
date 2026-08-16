import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect } from "react";

import { routeDeepLink } from "../deep-links/route-deep-link";
import { getAccessToken } from "../storage/secure-session";
import { useAppStore } from "../store/app-store";

export function useDeepLinkHandler() {
  const setPendingDeepLink = useAppStore((s) => s.setPendingDeepLink);

  useEffect(() => {
    async function handle(url: string | null) {
      if (!url) return;
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
  }, [setPendingDeepLink]);
}
