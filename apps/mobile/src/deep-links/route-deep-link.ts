import { router } from "expo-router";

import { parseLotDeepLink } from "./parse-lot-link";
import { resolveDeepLinkTarget } from "./resolve-deep-link-target";

export function routeDeepLink(uri: string): boolean {
  const parsed = parseLotDeepLink(uri);
  if (!parsed) return false;

  const target = resolveDeepLinkTarget(parsed);
  if (typeof target === "string") {
    router.push(target);
    return true;
  }

  router.push({
    pathname: target.pathname,
    params: target.params,
  });
  return true;
}

export { deepLinkTargetToHref, resolveDeepLinkTarget } from "./resolve-deep-link-target";
