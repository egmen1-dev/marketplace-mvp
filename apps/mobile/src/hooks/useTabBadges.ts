import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { refreshTabBadges } from "../commerce/refresh-tab-badges";

export function useTabBadges() {
  useFocusEffect(
    useCallback(() => {
      void refreshTabBadges();
    }, []),
  );
}

export { refreshTabBadges };
