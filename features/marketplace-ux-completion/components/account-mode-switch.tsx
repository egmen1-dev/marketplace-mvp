"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { setAccountModeAction } from "@/lib/marketplace-ux-completion/actions";
import type { AccountMode } from "@/lib/marketplace-ux-completion/types";

type AccountModeSwitchProps = {
  mode: AccountMode;
  isSeller: boolean;
};

export function AccountModeSwitch({ mode, isSeller }: AccountModeSwitchProps) {
  const [pending, startTransition] = useTransition();

  if (!isSeller) return null;

  function switchMode(next: AccountMode) {
    startTransition(async () => {
      await setAccountModeAction(next);
      window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-2" data-testid="account-mode-switch">
      <p className="text-sm font-medium">Режим</p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "buyer" ? "default" : "outline"}
          disabled={pending}
          onClick={() => switchMode("buyer")}
        >
          Покупатель
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "seller" ? "default" : "outline"}
          disabled={pending}
          onClick={() => switchMode("seller")}
        >
          Продавец
        </Button>
      </div>
    </div>
  );
}
