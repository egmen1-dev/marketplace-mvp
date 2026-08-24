import { useCallback, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { fetchMobileUpdate, postTelemetry, type MobileUpdateInfo } from "../api/endpoints";
import { useAppStore } from "../store/app-store";
import { emitStartupEvent, STARTUP_EVENTS } from "../boot/startup-telemetry";
import { fetchInstallableUpdate, isInstallableUpdate } from "./update-availability";
import { shouldShowUpdatePrompt } from "./update-defer-storage";
import { UPDATE_ANALYTICS } from "./types";

async function maybeShowPrompt(payload: MobileUpdateInfo, setVisible: (v: boolean) => void) {
  if (payload.updateState === "UNSUPPORTED_CLIENT") return;
  if (payload.updateState !== "NO_UPDATE") {
    void postTelemetry({
      screen: "update",
      event: UPDATE_ANALYTICS.available,
      errorCode: payload.versionName,
    }).catch(() => null);
  }
  const show = await shouldShowUpdatePrompt(payload);
  if (show && payload.updateState !== "NO_UPDATE") {
    setVisible(true);
    void postTelemetry({
      screen: "update",
      event: UPDATE_ANALYTICS.viewed,
      errorCode: payload.versionName,
    }).catch(() => null);
  }
}

export function useUpdateCheck(autoCheck = false) {
  const bootstrapped = useAppStore((s) => s.bootstrapped);
  const setPendingUpdate = useAppStore((s) => s.setPendingUpdate);
  const setUpdateAvailable = useAppStore((s) => s.setUpdateAvailable);
  const [info, setInfo] = useState<MobileUpdateInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPayload = useCallback(
    async (payload: MobileUpdateInfo | null) => {
      setInfo(payload);
      setUpdateAvailable(payload);
      setPendingUpdate(payload);
      if (payload) {
        await maybeShowPrompt(payload, setVisible);
      }
    },
    [setPendingUpdate, setUpdateAvailable],
  );

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    emitStartupEvent(STARTUP_EVENTS.updateCheckStart);
    try {
      const installable = await fetchInstallableUpdate();
      if (installable) {
        emitStartupEvent(STARTUP_EVENTS.updateCheckOk, installable.updateState);
        await applyPayload(installable);
        return installable;
      }
      const payload = await fetchMobileUpdate();
      emitStartupEvent(STARTUP_EVENTS.updateCheckOk, payload.updateState);
      setInfo(payload);
      setUpdateAvailable(null);
      setPendingUpdate(null);
      return payload;
    } catch (err) {
      const message = err instanceof Error ? err.message : "network_error";
      emitStartupEvent(STARTUP_EVENTS.updateCheckFail, message.slice(0, 80));
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [applyPayload, setPendingUpdate, setUpdateAvailable]);

  useEffect(() => {
    if (!autoCheck || !bootstrapped) return;
    void check();
  }, [autoCheck, bootstrapped, check]);

  useEffect(() => {
    if (!autoCheck || !bootstrapped) return;

    const onChange = (state: AppStateStatus) => {
      if (state === "active") void check();
    };

    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [autoCheck, bootstrapped, check]);

  return {
    info,
    visible,
    setVisible,
    loading,
    error,
    hasUpdate: isInstallableUpdate(info),
    check,
  };
}
