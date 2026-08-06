"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  updateSellerSettingsAction,
  type SettingsActionState,
} from "@/features/seller/actions";
import type { SellerSettings } from "@/features/seller/queries";
import { TOAST, toastError } from "@/lib/toasts";

const initialState: SettingsActionState = { ok: false };

type SellerSettingsFormProps = {
  settings: SellerSettings;
};

export function SellerSettingsForm({ settings }: SellerSettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    updateSellerSettingsAction,
    initialState,
  );
  const toasted = useRef(false);

  useEffect(() => {
    if (state.ok && !toasted.current) {
      toasted.current = true;
      toast.success(TOAST.SETTINGS_SAVED);
    } else if (state.error) {
      toasted.current = false;
      toastError(state.error);
    }
  }, [state]);

  useEffect(() => {
    if (pending) toasted.current = false;
  }, [pending]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="storeName">Название магазина</Label>
        <Input
          id="storeName"
          name="storeName"
          required
          defaultValue={settings.storeName}
          aria-invalid={Boolean(state.fieldErrors?.storeName)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          className="rounded-xl bg-surface"
          defaultValue={settings.description ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="logoUrl">URL логотипа</Label>
        <Input
          id="logoUrl"
          name="logoUrl"
          type="url"
          placeholder="https://…"
          defaultValue={settings.logoUrl ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Телефон</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={settings.phone ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={settings.email ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Адрес</Label>
        <Input
          id="address"
          name="address"
          defaultValue={settings.address ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="shippingDefaults">Доставка по умолчанию</Label>
        <Textarea
          id="shippingDefaults"
          name="shippingDefaults"
          rows={3}
          className="rounded-xl bg-surface"
          placeholder="Сроки, регионы, условия…"
          defaultValue={settings.shippingDefaults ?? ""}
        />
      </div>

      {state.error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-primary">Сохранено</p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Сохраняем…" : "Сохранить"}
      </Button>
    </form>
  );
}
