"use server";

import { cookies } from "next/headers";

import {
  trackAccountModeSwitch,
  trackBuyerDiscoveryOpened,
  trackOnboardingCompleted,
  trackOnboardingStarted,
} from "./analytics";
import { ONBOARDING_COOKIE } from "./onboarding";
import type { AccountMode } from "./types";

const MODE_COOKIE = "lot_account_mode";

export async function getAccountMode(): Promise<AccountMode> {
  const jar = await cookies();
  return jar.get(MODE_COOKIE)?.value === "seller" ? "seller" : "buyer";
}

export async function setAccountModeAction(mode: AccountMode): Promise<void> {
  const jar = await cookies();
  jar.set(MODE_COOKIE, mode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  trackAccountModeSwitch(mode);
}

export async function startBuyerOnboardingAction(): Promise<void> {
  trackOnboardingStarted();
}

export async function completeBuyerOnboardingAction(): Promise<void> {
  const jar = await cookies();
  jar.set(ONBOARDING_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 5,
    sameSite: "lax",
  });
  trackOnboardingCompleted("buyer");
}

export async function openBuyerDiscoveryAction(): Promise<void> {
  trackBuyerDiscoveryOpened();
}
