"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/features/auth";
import { ROUTES } from "@/lib/constants";

import {
  createRankingExperiment,
  executeRankingExperiment,
} from "./experiments";
import { assertAdminRole } from "./permissions";
import { simulateSellerProductRanking } from "./queries";
import {
  trackRankingExperimentCreated,
  trackRankingLabRun,
  trackRankingSimulation,
} from "./analytics";
import { isMarketplaceRankingIntelligenceEnabled } from "./flags";
import type { RankingSimulateInput } from "./types";

export async function simulateRankingAction(input: {
  sellerProfileId: string;
  productId: string;
  changes: RankingSimulateInput;
}) {
  if (!isMarketplaceRankingIntelligenceEnabled()) {
    return { ok: false as const, error: "Модуль выключен" };
  }

  const result = await simulateSellerProductRanking(input);
  if (!result) return { ok: false as const, error: "Не удалось выполнить симуляцию" };

  trackRankingSimulation(input.productId);
  return { ok: true as const, result };
}

export async function createLabExperimentAction(input: {
  name: string;
  purpose: string;
  datasetSize: number;
  changedFactor: string;
}) {
  if (!isMarketplaceRankingIntelligenceEnabled()) {
    return { ok: false as const, error: "Модуль выключен" };
  }

  const user = await getSessionUser();
  assertAdminRole(user?.role);

  const experiment = await createRankingExperiment({
    ...input,
    createdById: user?.id,
  });
  trackRankingExperimentCreated(experiment.id);
  revalidatePath(ROUTES.ADMIN_RANKING);
  return { ok: true as const, experiment };
}

export async function runLabExperimentAction(experimentId: string) {
  if (!isMarketplaceRankingIntelligenceEnabled()) {
    return { ok: false as const, error: "Модуль выключен" };
  }

  const user = await getSessionUser();
  assertAdminRole(user?.role);

  const experiment = await executeRankingExperiment(experimentId);
  trackRankingLabRun(experimentId);
  revalidatePath(ROUTES.ADMIN_RANKING);
  return { ok: true as const, experiment };
}
