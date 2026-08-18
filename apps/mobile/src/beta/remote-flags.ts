import { getBetaConfig } from "./config";

export type RemoteFlags = Record<string, boolean>;

let flags: RemoteFlags = {};

export function setRemoteFlags(input: RemoteFlags): RemoteFlags {
  flags = { ...input };
  return flags;
}

export function getRemoteFlags(): RemoteFlags {
  return { ...flags, ...getBetaConfig().flags };
}

export function isFlagEnabled(key: string): boolean {
  const all = getRemoteFlags();
  return all[key] === true;
}

export function getRemoteConfigValue<T>(key: string, fallback: T): T {
  const remote = getBetaConfig().remoteConfig;
  const value = remote[key];
  return (value as T) ?? fallback;
}
