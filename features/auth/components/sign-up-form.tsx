"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signUpAction,
  type AuthActionState,
} from "@/features/auth/actions";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const initialState: AuthActionState = { ok: false };

export function SignUpForm() {
  const [role, setRole] = useState<"BUYER" | "SELLER">("BUYER");
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="role" value={role} />

      <div className="flex flex-col gap-2">
        <Label>Тип аккаунта</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole("BUYER")}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-sm transition-colors",
              role === "BUYER"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            Покупатель
          </button>
          <button
            type="button"
            onClick={() => setRole("SELLER")}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-sm transition-colors",
              role === "SELLER"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            Продавец
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          После регистрации можно и покупать, и создавать объявления.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Имя</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Алексей"
          aria-invalid={Boolean(state.fieldErrors?.name)}
        />
        {state.fieldErrors?.name?.[0] ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email?.[0] ? (
          <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Не менее 8 символов"
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        {state.fieldErrors?.password?.[0] ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.password[0]}
          </p>
        ) : null}
      </div>

      {role === "SELLER" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="storeName">Название магазина</Label>
          <Input
            id="storeName"
            name="storeName"
            placeholder="Мой магазин"
            aria-invalid={Boolean(state.fieldErrors?.storeName)}
          />
          {state.fieldErrors?.storeName?.[0] ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.storeName[0]}
            </p>
          ) : null}
        </div>
      ) : null}

      {state.error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Создаём аккаунт…" : "Зарегистрироваться"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Уже есть аккаунт?{" "}
        <Link
          href={ROUTES.AUTH_SIGN_IN}
          className="text-primary underline-offset-4 hover:underline"
        >
          Войти
        </Link>
      </p>
    </form>
  );
}
