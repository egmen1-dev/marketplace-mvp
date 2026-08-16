import { createHash } from "node:crypto";

import type { CognitiveContext } from "./types";

export function contextFingerprint(context: Pick<CognitiveContext, "query" | "category" | "market" | "device" | "buyer" | "seller" | "contextVersion">): string {
  const payload = JSON.stringify({
    v: context.contextVersion,
    q: context.query?.normalized ?? "",
    qi: context.query?.intent ?? null,
    c: context.category?.id ?? "",
    s: context.market?.season ?? "",
    d: context.device?.type ?? "",
    b: context.buyer?.sessionGoal ?? "",
    sl: context.seller?.lifecycle ?? "",
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}
