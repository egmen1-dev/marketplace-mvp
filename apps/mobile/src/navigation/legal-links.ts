import { Linking } from "react-native";

import { loadAppConfig } from "../config/env";

const LEGAL_PATHS = {
  privacy: "/privacy",
  terms: "/terms",
  about: "/about",
  support: "/support",
  contacts: "/contacts",
} as const;

export type LegalPage = keyof typeof LEGAL_PATHS;

/** Intentional web fallback for legal/support pages hosted on staging web. */
export function openLegalPage(page: LegalPage) {
  const config = loadAppConfig();
  Linking.openURL(`${config.apiBaseUrl}${LEGAL_PATHS[page]}`);
}

export function openSupportPage() {
  openLegalPage("support");
}
