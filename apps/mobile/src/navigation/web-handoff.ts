import { Linking } from "react-native";

import { fetchWebHandoffUrl } from "../api/endpoints";

/** Secure web handoff for seller onboarding and product create (EPIC 152). */
export async function openWebHandoff(dest: string) {
  const { handoffUrl } = await fetchWebHandoffUrl(dest);
  await Linking.openURL(handoffUrl);
}
