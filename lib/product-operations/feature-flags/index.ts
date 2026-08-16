import type { ProductFlagStage, ProductOpsSurface } from "@prisma/client";

import { MODULE_REGISTRY } from "@/lib/marketplace-deploy-visibility/registry";
import { prisma } from "@/lib/prisma";

import { recordAuditEvent } from "../telemetry/audit";
import type { FlagAudience, ProductFlagDefinition } from "../types";
import { FLAG_STAGES } from "../types";

const STAGE_ORDER: Record<ProductFlagStage, number> = {
  OFF: 0,
  INTERNAL: 1,
  ALPHA: 2,
  BETA: 3,
  PRODUCTION: 4,
};

function envEnabled(envVar: string): boolean {
  return process.env[envVar] === "true";
}

function audienceMeetsStage(audience: FlagAudience, stage: ProductFlagStage): boolean {
  if (stage === "OFF") return false;
  if (stage === "PRODUCTION") return true;
  if (stage === "BETA") return audience === "beta" || audience === "production";
  if (stage === "ALPHA") return audience === "alpha" || audience === "beta" || audience === "production";
  if (stage === "INTERNAL") return audience === "internal";
  return false;
}

export async function listProductFlags(surface: ProductOpsSurface = "ALL"): Promise<ProductFlagDefinition[]> {
  const overrides = await prisma.productFlagOverride.findMany({
    where: surface === "ALL" ? {} : { OR: [{ surface }, { surface: "ALL" }] },
  });
  const overrideMap = new Map(overrides.map((o) => [`${o.key}:${o.surface}`, o]));

  const registryFlags = MODULE_REGISTRY.map((m) => {
    const db = overrideMap.get(`${m.id}:ALL`) ?? overrideMap.get(`${m.id}:${surface}`);
    const envOn = envEnabled(m.envVar);
    const stage = db?.stage ?? (envOn ? "PRODUCTION" : "OFF");
    return {
      key: m.id,
      label: m.name,
      envVar: m.envVar,
      stage,
      enabled: db?.enabled ?? envOn,
      surface: (db?.surface ?? "ALL") as ProductOpsSurface,
      source: db ? ("db" as const) : envOn ? ("env" as const) : ("default" as const),
    };
  });

  const extraOverrides = overrides
    .filter((o) => !registryFlags.some((f) => f.key === o.key))
    .map((o) => ({
      key: o.key,
      label: o.key,
      envVar: undefined,
      stage: o.stage,
      enabled: o.enabled,
      surface: o.surface,
      source: "db" as const,
    }));

  return [...registryFlags, ...extraOverrides].sort((a, b) => a.key.localeCompare(b.key));
}

export async function resolveFlag(key: string, audience: FlagAudience = "alpha"): Promise<boolean> {
  const row = await prisma.productFlagOverride.findFirst({
    where: { key, OR: [{ surface: "ALL" }, { surface: "MOBILE" }] },
  });

  if (row) {
    return row.enabled && audienceMeetsStage(audience, row.stage);
  }

  const registryEntry = MODULE_REGISTRY.find((m) => m.id === key);
  if (registryEntry) return envEnabled(registryEntry.envVar);
  return false;
}

export async function setProductFlag(input: {
  key: string;
  stage: ProductFlagStage;
  enabled: boolean;
  surface?: ProductOpsSurface;
  notes?: string;
  actorId?: string;
}) {
  if (!FLAG_STAGES.includes(input.stage)) {
    throw new Error("Invalid flag stage");
  }

  const row = await prisma.productFlagOverride.upsert({
    where: { key_surface: { key: input.key, surface: input.surface ?? "ALL" } },
    create: {
      key: input.key,
      stage: input.stage,
      enabled: input.enabled,
      surface: input.surface ?? "ALL",
      notes: input.notes ?? "",
      updatedBy: input.actorId,
    },
    update: {
      stage: input.stage,
      enabled: input.enabled,
      notes: input.notes ?? "",
      updatedBy: input.actorId,
    },
  });

  await recordAuditEvent({
    action: "flag_update",
    entityKey: input.key,
    actorId: input.actorId,
    payload: { stage: input.stage, enabled: input.enabled },
  });

  return row;
}

export function compareFlagStages(a: ProductFlagStage, b: ProductFlagStage): number {
  return STAGE_ORDER[a] - STAGE_ORDER[b];
}
