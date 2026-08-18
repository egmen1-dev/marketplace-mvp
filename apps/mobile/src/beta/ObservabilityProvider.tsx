import { useEffect, type ReactNode } from "react";
import { usePathname } from "expo-router";

import { applyBetaConfig } from "./config";
import { setRemoteFlags } from "./remote-flags";
import { trackScreenOpen } from "./session-recorder";
import { reportUnhandledPromise } from "./crash-reporter";
import { useAppStore } from "../store/app-store";

function screenFromPath(pathname: string): string {
  if (!pathname || pathname === "/") return "boot";
  if (pathname.startsWith("/product/")) return "product";
  if (pathname.startsWith("/order/")) return "orders";
  if (pathname.startsWith("/seller/")) return "seller";
  if (pathname.includes("seller-home")) return "seller_home";
  if (pathname.includes("seller-products")) return "seller_products";
  if (pathname.includes("seller-sales")) return "seller_orders";
  if (pathname === "/login") return "login";
  if (pathname === "/cart") return "cart";
  if (pathname === "/checkout") return "checkout";
  if (pathname === "/feedback") return "feedback";
  if (pathname.includes("catalog")) return "catalog";
  if (pathname.includes("favorites")) return "favorites";
  if (pathname.includes("wallet")) return "wallet";
  if (pathname.includes("profile")) return "profile";
  if (pathname.includes("orders")) return "orders";
  return pathname.replace(/^\//, "").replace(/\//g, "_") || "home";
}

type Props = { children: ReactNode };

export function ObservabilityProvider({ children }: Props) {
  const pathname = usePathname();
  const remoteConfig = useAppStore((s) => s.remoteConfig);

  useEffect(() => {
    const flagsArray = remoteConfig.flags as Array<{ key: string; enabled: boolean }> | undefined;
    const flags = flagsArray
      ? Object.fromEntries(flagsArray.map((f) => [f.key, f.enabled]))
      : ((remoteConfig.flags as Record<string, boolean>) ?? {});
    applyBetaConfig(remoteConfig, flags);
    setRemoteFlags(flags);
  }, [remoteConfig]);

  useEffect(() => {
    const screen = screenFromPath(pathname);
    trackScreenOpen(screen);
  }, [pathname]);

  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
      reportUnhandledPromise(screenFromPath(pathname), reason);
    };
    // React Native doesn't have window.addEventListener for unhandledrejection in all versions
    if (typeof globalThis.addEventListener === "function") {
      globalThis.addEventListener("unhandledrejection", handler as EventListener);
      return () => globalThis.removeEventListener("unhandledrejection", handler as EventListener);
    }
    return undefined;
  }, [pathname]);

  return children;
}
