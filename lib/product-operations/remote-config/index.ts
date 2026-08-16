import type { Prisma, ProductOpsSurface } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { MobileClientConfigPayload } from "@/lib/mobile/client-config";
import { buildMobileClientConfig } from "@/lib/mobile/client-config";
import type { MobileBootstrapPayload } from "@/lib/mobile/bootstrap";
import { buildMobileBootstrapPayload } from "@/lib/mobile/bootstrap";

import { recordAuditEvent } from "../telemetry/audit";
import type { RemoteConfigMap } from "../types";

export async function getRemoteConfigMap(surface: ProductOpsSurface = "MOBILE"): Promise<RemoteConfigMap> {
  const rows = await prisma.remoteConfigEntry.findMany({
    where: { OR: [{ surface }, { surface: "ALL" }] },
  });

  const map: RemoteConfigMap = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

export async function setRemoteConfigEntry(input: {
  key: string;
  value: unknown;
  surface?: ProductOpsSurface;
  actorId?: string;
}) {
  const row = await prisma.remoteConfigEntry.upsert({
    where: { key_surface: { key: input.key, surface: input.surface ?? "MOBILE" } },
    create: {
      key: input.key,
      value: input.value as Prisma.InputJsonValue,
      surface: input.surface ?? "MOBILE",
      updatedBy: input.actorId,
    },
    update: {
      value: input.value as Prisma.InputJsonValue,
      version: { increment: 1 },
      updatedBy: input.actorId,
    },
  });

  await recordAuditEvent({
    action: "remote_config_update",
    entityKey: input.key,
    actorId: input.actorId,
    payload: { version: row.version },
  });

  return row;
}

function applyRemotePatches<T extends Record<string, unknown>>(base: T, patches: RemoteConfigMap): T & { remoteConfig: RemoteConfigMap } {
  const merged = { ...base, ...patches } as T & { remoteConfig: RemoteConfigMap };
  merged.remoteConfig = patches;
  return merged;
}

export async function buildMobileClientConfigWithRemoteConfig(): Promise<
  MobileClientConfigPayload & { remoteConfig: RemoteConfigMap; configVersion: number }
> {
  const base = buildMobileClientConfig();
  const remoteConfig = await getRemoteConfigMap("MOBILE");

  const limits = remoteConfig.limits as MobileClientConfigPayload["limits"] | undefined;
  const supportedFeatures = remoteConfig.supportedFeatures as string[] | undefined;
  const modules = remoteConfig.modules as MobileClientConfigPayload["modules"] | undefined;

  const merged: MobileClientConfigPayload & { remoteConfig: RemoteConfigMap; configVersion: number } = {
    ...base,
    limits: limits ?? base.limits,
    supportedFeatures: supportedFeatures ?? base.supportedFeatures,
    modules: modules ?? base.modules,
    remoteConfig,
    configVersion: Object.keys(remoteConfig).length,
  };

  if (remoteConfig.hideCheckout === true) {
    merged.supportedFeatures = merged.supportedFeatures.filter((f) => f !== "checkout");
  }

  return merged;
}

export async function buildMobileBootstrapWithRemoteConfig(): Promise<
  MobileBootstrapPayload & { remoteConfig: RemoteConfigMap }
> {
  const base = buildMobileBootstrapPayload();
  const remoteConfig = await getRemoteConfigMap("MOBILE");

  const recommendedSyncIntervalSec =
    typeof remoteConfig.recommendedSyncIntervalSec === "number"
      ? remoteConfig.recommendedSyncIntervalSec
      : base.recommendedSyncIntervalSec;

  return applyRemotePatches(
    {
      ...base,
      recommendedSyncIntervalSec,
      featureFlags: {
        ...base.featureFlags,
        ...(remoteConfig.featureFlags as Partial<MobileBootstrapPayload["featureFlags"]> | undefined),
      },
    },
    remoteConfig,
  );
}

export async function listRemoteConfigEntries(surface?: ProductOpsSurface) {
  return prisma.remoteConfigEntry.findMany({
    where: surface ? { OR: [{ surface }, { surface: "ALL" }] } : undefined,
    orderBy: { key: "asc" },
  });
}
