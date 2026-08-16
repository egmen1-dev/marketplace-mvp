import { describe, expect, it, beforeEach } from "vitest";

import {
  registerSimulationPort,
  resetSimulationPortRegistry,
  requireSimulationPort,
  evaluateSimulationWithTimeout,
  SIMULATION_PORT_CONTRACT_VERSION,
  type RankingSimulationPort,
} from "@/lib/ccos/simulation";
import { DEFAULT_SCENARIOS } from "@/lib/ccos/twin/scenarios";
import { ensureMarketplaceRankingSimulationPortRegistered } from "@/lib/marketplace-cognitive-platform/adapters/ranking-simulation.adapter";
import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

const fanProduct: RankingProductInput = {
  id: "fan-1",
  name: "Напольный вентилятор",
  price: 4500,
  compareAt: null,
  status: "ACTIVE",
  stock: 8,
  views: 240,
  favoritesCount: 12,
  categoryId: "fans",
  categoryName: "Климат",
  descriptionLength: 140,
  seoTitleLength: 28,
  seoDescriptionLength: 90,
  photoCount: 3,
  hasVideo: false,
  characteristicCount: 5,
  hasBrand: true,
  sellerId: "seller-1",
  sellerBlocked: false,
  sellerTrustScore: 82,
  sellerReviewsCount: 20,
  sellerAverageRating: 4.7,
  sellerCompletedOrders: 35,
  sellerCancellationRate: 0.01,
  moderationStatus: "APPROVED",
  prohibitedHit: false,
  qualityScore: 80,
  cartAdds: 12,
  ordersCount: 6,
  promotionActive: false,
  photoQuality: 58,
  descriptionQuality: 65,
};

describe("ccos simulation port", () => {
  beforeEach(() => {
    resetSimulationPortRegistry();
    ensureMarketplaceRankingSimulationPortRegistered();
  });

  it("registers and resolves marketplace ranking simulation port", () => {
    const port = requireSimulationPort("marketplace-ranking-simulation");
    expect(port.id).toBe("marketplace-ranking-simulation");
    expect(port.contractVersion).toBe(SIMULATION_PORT_CONTRACT_VERSION);
    expect(port.app).toBe("marketplace");
  });

  it("evaluates combo scenario with provenance fields", async () => {
    const port = requireSimulationPort("marketplace-ranking-simulation");
    const combo = DEFAULT_SCENARIOS.find((s) => s.id === "scenario_combo")!;

    const result = await port.evaluate({
      entityId: fanProduct.id,
      observations: [],
      graphContext: { coverage: 0.55, propagatedConfidence: 0.48 },
      scenario: combo,
      mode: "scenario",
      binding: { rankingInput: fanProduct, peerScores: [70, 66, 62], weights: DEFAULT_RANKING_WEIGHTS_V1 },
    });

    expect(result.status).toBe("OK");
    expect(result.source.portId).toBe("marketplace-ranking-simulation");
    expect(result.source.app).toBe("marketplace");
    expect(result.source.module).toBeTruthy();
    expect(result.source.version).toBeTruthy();
    expect(result.confidence).toBeLessThanOrEqual(0.48 * 1.05 + 0.001);
  });

  it("returns DEGRADED on invalid binding without throwing", async () => {
    const port = requireSimulationPort("marketplace-ranking-simulation");
    const result = await port.evaluate({
      entityId: "x",
      observations: [],
      scenario: DEFAULT_SCENARIOS[0],
      mode: "scenario",
      binding: null,
    });
    expect(result.status).toBe("DEGRADED");
    expect(result.failedPort).toBe("marketplace-ranking-simulation");
  });

  it("returns TIMEOUT when port hangs", async () => {
    const slowPort: RankingSimulationPort = {
      id: "slow-port",
      version: "v0",
      contractVersion: SIMULATION_PORT_CONTRACT_VERSION,
      app: "marketplace",
      evaluate: () => new Promise(() => {}),
    };
    registerSimulationPort(slowPort);

    const result = await evaluateSimulationWithTimeout(
      slowPort,
      {
        entityId: "x",
        observations: [],
        scenario: DEFAULT_SCENARIOS[0],
        mode: "baseline",
      },
      50,
    );

    expect(result.status).toBe("TIMEOUT");
    expect(result.retryable).toBe(true);
    expect(result.failedPort).toBe("slow-port");
  });
});
