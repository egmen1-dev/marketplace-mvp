import type { ContentQualityProvider } from "../content-quality-provider";
import { RuleBasedFallbackProvider } from "../rule-based-fallback";
import { createDaosClientFromEnv } from "./client";
import { evaluateWithDaosFallback } from "./fallback";
import { mapProductToDaosRequest, mergeDaosHints } from "./mapper";
import { DAOS_PROVIDER_VERSION } from "../../version";

export class DaosContentQualityProvider implements ContentQualityProvider {
  readonly name = "daos";
  readonly version = DAOS_PROVIDER_VERSION;
  private readonly fallback: RuleBasedFallbackProvider;

  constructor(fallback: RuleBasedFallbackProvider) {
    this.fallback = fallback;
  }

  async evaluateProduct(
    input: Parameters<ContentQualityProvider["evaluateProduct"]>[0],
  ) {
    const client = createDaosClientFromEnv();
    if (!client) {
      return this.fallback.evaluateProduct(input);
    }

    const daosResponse = await client.evaluateCritics(mapProductToDaosRequest(input));
    if (!daosResponse.ok) {
      const evaluation = await this.fallback.evaluateProduct(input);
      return { ...evaluation, provider: "rule-based-fallback", daosUsed: false, fallbackUsed: true };
    }

    const merged = mergeDaosHints(input, daosResponse);
    return evaluateWithDaosFallback(this.fallback, merged, true);
  }
}

export { createDaosClientFromEnv } from "./client";
export { mapProductToDaosRequest, mergeDaosHints } from "./mapper";
