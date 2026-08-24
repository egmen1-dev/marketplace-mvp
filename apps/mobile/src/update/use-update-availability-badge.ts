import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";

import { useAppStore } from "../store/app-store";
import { fetchInstallableUpdate } from "./update-availability";

/** Keeps profile badge and menu in sync with MRP without requiring cold start. */
export function useUpdateAvailabilityBadge() {
  const bootstrapped = useAppStore((s) => s.bootstrapped);
  const cached = useAppStore((s) => s.updateAvailable);
  const setUpdateAvailable = useAppStore((s) => s.setUpdateAvailable);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!bootstrapped) return;
    setLoading(true);
    try {
      const info = await fetchInstallableUpdate();
      setUpdateAvailable(info);
    } finally {
      setLoading(false);
    }
  }, [bootstrapped, setUpdateAvailable]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (bootstrapped && !cached) void refresh();
  }, [bootstrapped, cached, refresh]);

  return {
    updateAvailable: cached,
    loading,
    refresh,
  };
}
