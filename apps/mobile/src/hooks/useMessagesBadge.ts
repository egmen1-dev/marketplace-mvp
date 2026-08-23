import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { AppState } from "react-native";

import { fetchConversationsUnread } from "../api/endpoints";
import { useAppStore } from "../store/app-store";

/** Refresh messages badge on focus and app foreground — no polling loop. */
export function useMessagesBadge() {
  const setBadges = useAppStore((s) => s.setBadges);

  const refresh = useCallback(async () => {
    try {
      const unread = await fetchConversationsUnread();
      setBadges({ messages: unread.unreadTotal });
    } catch {
      // badge is best-effort
    }
  }, [setBadges]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useFocusEffect(
    useCallback(() => {
      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") void refresh();
      });
      return () => sub.remove();
    }, [refresh]),
  );
}
