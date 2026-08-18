import { useCallback, useEffect, useState } from "react";

import { getCommerceUseCases } from "../../domain/services/commerce-container";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { useAppStore } from "../../store/app-store";

export function useProfileData() {
  const commerce = getCommerceUseCases();
  const mode = useAppStore((s) => s.mode);
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const setMode = useAppStore((s) => s.setMode);
  const [email, setEmail] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return {
    email,
    mode,
    sellerCapable,
    loading,
    error,
    onLogout,
    onSwitchMode,
    submitFeedback,
    reload: load,
  };
}

export type ProfileDataState = ReturnType<typeof useProfileData>;
