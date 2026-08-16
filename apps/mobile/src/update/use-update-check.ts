import { useCallback, useEffect, useState } from "react";

import { fetchMobileUpdate, postTelemetry } from "../api/endpoints";
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
    try {
      const payload = await fetchMobileUpdate();
      setInfo(payload);

      if (payload.updateState !== "NO_UPDATE") {
        await postTelemetry({
          screen: "update",
          event: UPDATE_ANALYTICS.available,
          errorCode: payload.versionName,
        });
      }

      const show = await shouldShowUpdatePrompt(payload);
      if (show && payload.updateState !== "NO_UPDATE") {
        setVisible(true);
        await postTelemetry({
          screen: "update",
          event: UPDATE_ANALYTICS.viewed,
          errorCode: payload.versionName,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "network_error");
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
