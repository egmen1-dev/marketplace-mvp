"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createPickupPointAction,
  updatePickupPointAction,
  type PickupActionState,
} from "@/features/pickup/actions";
import type { PickupPointDto } from "@/features/pickup/queries";

const initial: PickupActionState = { ok: false };

type Props = {
  mode: "create" | "edit";
  point?: PickupPointDto;
};

export function PickupPointForm({ mode, point }: Props) {
  const action =
    mode === "edit" && point
      ? updatePickupPointAction.bind(null, point.id)
      : createPickupPointAction;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {state.error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Название</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={point?.name ?? ""}
          placeholder="Основной склад"
        />
        {state.fieldErrors?.name?.[0] ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="city">Город</Label>
        <Input
          id="city"
          name="city"
          required
          defaultValue={point?.city ?? ""}
          placeholder="Екатеринбург"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Адрес</Label>
        <Input
          id="address"
          name="address"
          required
          defaultValue={point?.address ?? ""}
          placeholder="ул. Ленина 10"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Телефон</Label>
        <Input
          id="phone"
          name="phone"
          defaultValue={point?.phone ?? ""}
          placeholder="+7…"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="workingHours">График работы</Label>
        <Input
          id="workingHours"
          name="workingHours"
          defaultValue={point?.workingHours ?? ""}
          placeholder="Пн–Пт 09:00–18:00"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Комментарий для покупателя</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={point?.description ?? ""}
          placeholder="Позвонить за 30 минут до приезда"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          value="on"
          defaultChecked={point?.isActive ?? true}
          className="size-4 rounded border-border"
        />
        Точка активна
      </label>

      <Button type="submit" disabled={pending}>
        {pending
          ? "Сохраняем…"
          : mode === "create"
            ? "Добавить точку"
            : "Сохранить"}
      </Button>
    </form>
  );
}
