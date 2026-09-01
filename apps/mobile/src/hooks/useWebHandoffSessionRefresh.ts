import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { refreshSessionRole } from "../api/client";
import { useAppStore } from "../store/app-store";

/** Refresh seller capability after supported web handoff returns to the app. */
export function useWebHandoffSessionRefresh() {
  const setPendingWebHandoff = useAppStore((s) => s.setPendingWebHandoff);
  const setUserRole = useAppStore((s) => s.setUserRole);

  useEffect(() => {
    let previous: AppStateStatus = AppState.currentState;

    const sub = AppState.addEventListener("change", (next) => {
      const resumed = /inactive|background/.test(previous) && next === "active";
      previous = next;
      if (!resumed) return;

      const pending = useAppStore.getState().pendingWebHandoff;
      if (!pending) return;

      void (async () => {
        const role = await refreshSessionRole();
        setPendingWebHandoff(null);
        if (role) setUserRole(role);
      })();
    });

    return () => sub.remove();
  }, [setPendingWebHandoff, setUserRole]);
}
