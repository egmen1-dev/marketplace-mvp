import { useCallback, useEffect, useState } from "react";

import { loadAppConfig } from "../../config/env";
import { getCommerceUseCases } from "../../composition/commerce-container";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { startApkDownload } from "../../update/download-apk";
import { fetchMobileUpdateInfo } from "../../update/mobile-update-client";
import { UPDATE_ANALYTICS, type MobileUpdateInfo } from "../../update/types";
import { useAppStore } from "../../store/app-store";

export function useProfileData() {
  const commerce = getCommerceUseCases();
  const config = loadAppConfig();
  const mode = useAppStore((s) => s.mode);
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const setMode = useAppStore((s) => s.setMode);
  const [email, setEmail] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<MobileUpdateInfo | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await commerce.loadProfile.execute({});
    if (!result.ok) {
      setError(domainErrorMessage(result.error));
      setLoading(false);
      return;
    }
    const profile = result.value;
    const label = profile.email ?? profile.displayName ?? "—";
    setEmail(label.length > 12 ? `${label.slice(0, 8)}…` : label);
    setLoading(false);
  }, [commerce.loadProfile]);

  useEffect(() => {
    void load();
    void fetchMobileUpdateInfo().then(setUpdateInfo).catch(() => setUpdateInfo(null));
  }, [load]);

  useEffect(() => {
    return commerce.events.subscribe("ProfileUpdated", (event) => {
      const label = event.profile.email ?? event.profile.displayName ?? "—";
      setEmail(label.length > 12 ? `${label.slice(0, 8)}…` : label);
    });
  }, [commerce.events]);

  const onLogout = useCallback(async () => {
    await commerce.logoutUser.execute({});
  }, [commerce.logoutUser]);

  const onSwitchMode = useCallback(
    (next: "buyer" | "seller") => {
      setMode(next);
      void commerce.loadProfile.execute({}).then((result) => {
        if (result.ok) {
          commerce.events.publish({ type: "ProfileUpdated", profile: { ...result.value, mode: next } });
        }
      });
    },
    [commerce.events, commerce.loadProfile, setMode],
  );

  const submitFeedback = useCallback(
    async (input: { content: string; screen?: string }) => {
      return commerce.submitProductFeedback.execute(input);
    },
    [commerce.submitProductFeedback],
  );

  const hasUpdate =
    updateInfo &&
    updateInfo.updateState !== "NO_UPDATE" &&
    updateInfo.downloadUrl &&
    updateInfo.versionCode > Number(config.buildNumber) &&
    updateInfo.rollout.eligible;

  const onUpdate = useCallback(async () => {
    if (!updateInfo) return;
    commerce.trackScreenEvent({ screen: "profile", event: UPDATE_ANALYTICS.started, errorCode: updateInfo.versionName });
    await startApkDownload(updateInfo);
  }, [commerce, updateInfo]);

  const trackEvent = useCallback(
    (input: { event: string; errorCode?: string }) => {
      commerce.trackScreenEvent({ screen: "profile", ...input });
    },
    [commerce],
  );

  return {
    email,
    mode,
    sellerCapable,
    loading,
    error,
    updateInfo,
    hasUpdate,
    onLogout,
    onSwitchMode,
    submitFeedback,
    onUpdate,
    trackEvent,
    reload: load,
  };
}

export type ProfileDataState = ReturnType<typeof useProfileData>;
