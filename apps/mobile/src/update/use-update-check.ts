import { useCallback, useEffect, useState } from "react";

import { fetchMobileUpdate, postTelemetry } from "../api/endpoints";
import { emitStartupEvent, STARTUP_EVENTS } from "../boot/startup-telemetry";
import { shouldShowUpdatePrompt } from "./update-defer-storage";
import { UPDATE_ANALYTICS } from "./types";

export function useUpdateCheck(autoCheck = false) {
  const [info, setInfo] = useState<Awaited<ReturnType<typeof fetchMobileUpdate>> | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    emitStartupEvent(STARTUP_EVENTS.updateCheckStart);
    try {
      const payload = await fetchMobileUpdate();
      setInfo(payload);
      emitStartupEvent(STARTUP_EVENTS.updateCheckOk, payload.updateState);

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
    } catch (err) {
      const message = err instanceof Error ? err.message : "network_error";
      emitStartupEvent(STARTUP_EVENTS.updateCheckFail, message.slice(0, 80));
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoCheck) check();
  }, [autoCheck, check]);

  return {
    info,
    visible,
    setVisible,
    loading,
    error,
    hasUpdate: info != null && info.updateState !== "NO_UPDATE" && Boolean(info.downloadUrl),
    check,
  };
}
