import { router } from "expo-router";

import { mapLotDeepLinkToHref } from "./native-route-map";

export function routeDeepLink(uri: string): boolean {
  const href = mapLotDeepLinkToHref(uri);
  if (!href) return false;
  router.replace(href);
  return true;
}
