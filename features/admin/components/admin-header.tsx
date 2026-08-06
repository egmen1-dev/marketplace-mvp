"use client";

import { LogOut, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import type { SessionUser } from "@/features/auth/session";

type AdminHeaderProps =
  | { user: SessionUser; email?: never; name?: never }
  | { user?: never; email: string; name: string | null };

export function AdminHeader(props: AdminHeaderProps) {
  const email = props.user?.email ?? props.email ?? "";
  const name = props.user?.name ?? props.name ?? null;

  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Shield className="size-5" aria-hidden />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-lg font-semibold tracking-tight">
              Админ-панель
            </h1>
            <Badge variant="secondary">ADMIN</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{name || email}</p>
        </div>
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="sm">
          <LogOut data-icon="inline-start" />
          Выйти
        </Button>
      </form>
    </div>
  );
}
