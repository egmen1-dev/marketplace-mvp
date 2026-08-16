import { router } from "expo-router";

import { parseLotDeepLink } from "./parse-lot-link";

export function routeDeepLink(uri: string): boolean {
  const parsed = parseLotDeepLink(uri);
  if (!parsed) return false;

  switch (parsed.screen) {
    case "home":
      router.push("/(tabs)");
      return true;
    case "catalog":
      router.push("/(tabs)/catalog");
      return true;
    case "orders":
      router.push("/(tabs)/orders");
      return true;
    case "wallet":
      router.push("/(tabs)/wallet");
      return true;
    case "profile":
      router.push("/(tabs)/profile");
      return true;
    case "cart":
      router.push("/cart");
      return true;
    case "product":
    case "brainProduct":
      router.push(`/product/${parsed.productId}`);
      return true;
    case "order":
      router.push("/(tabs)/orders");
      return true;
    case "seller":
      router.push("/(tabs)/catalog");
      return true;
    default:
      return false;
  }
}
