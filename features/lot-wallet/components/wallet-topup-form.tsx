"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startWalletTopUpAction } from "@/lib/lot-wallet/actions";

const PRESETS = [500, 1000, 3000, 5000];

type WalletTopUpFormProps = {
  onSuccessMessage?: string;
};

export function WalletTopUpForm({ onSuccessMessage }: WalletTopUpFormProps) {
  const [amount, setAmount] = useState("5000");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const amountRub = Number(amount.replace(/\s/g, ""));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!Number.isFinite(amountRub) || amountRub < 100) {
      setError("Минимальная сумма — 100 ₽");
      return;
    }

    startTransition(() => {
      void (async () => {
        const result = await startWalletTopUpAction(amountRub);
        if (!result.ok) {
          setError(result.error ?? "Не удалось начать оплату");
          toast.error(result.error ?? "Не удалось начать оплату");
          return;
        }
        if ("checkoutUrl" in result && result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        }
      })();
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4" data-testid="wallet-topup-form">
      {onSuccessMessage ? (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-800 dark:text-green-200">
          {onSuccessMessage}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="topup-amount">Сумма</Label>
        <Input
          id="topup-amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="5000"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAmount(String(preset))}
          >
            {preset.toLocaleString("ru-RU")} ₽
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium">Способ оплаты</p>
        <p className="mt-1 text-muted-foreground">● Банковская карта (Stripe Checkout)</p>
        <p className="mt-3">
          К зачислению:{" "}
          <span className="font-semibold tabular-nums">
            {Number.isFinite(amountRub) ? amountRub.toLocaleString("ru-RU") : "—"} ₽
          </span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Пополненные средства можно тратить на покупки и продвижение, но нельзя вывести.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : "Пополнить"}
      </Button>
    </form>
  );
}
