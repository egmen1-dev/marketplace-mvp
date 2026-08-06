"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  changeUserRoleAction,
  setUserBlockedAction,
} from "@/features/admin/actions";
import type { AdminUserRow } from "@/features/admin/queries";

const ROLE_LABELS: Record<UserRole, string> = {
  BUYER: "Покупатель",
  SELLER: "Продавец",
  ADMIN: "Админ",
};

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

export function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  if (users.length === 0) {
    return (
      <p className="py-8 text-sm text-muted-foreground">
        Пользователей пока нет.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-2 py-2 font-medium">Имя</th>
            <th className="px-2 py-2 font-medium">Email</th>
            <th className="px-2 py-2 font-medium">Роль</th>
            <th className="px-2 py-2 font-medium">Регистрация</th>
            <th className="px-2 py-2 font-medium">Статус</th>
            <th className="px-2 py-2 font-medium">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-2 py-3 font-medium">
                {user.name || "—"}
              </td>
              <td className="px-2 py-3 text-muted-foreground">{user.email}</td>
              <td className="px-2 py-3">
                <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
              </td>
              <td className="px-2 py-3 tabular-nums text-muted-foreground">
                {formatDate(user.createdAt)}
              </td>
              <td className="px-2 py-3">
                {user.isBlocked ? (
                  <Badge variant="destructive">Заблокирован</Badge>
                ) : (
                  <Badge variant="outline">Активен</Badge>
                )}
              </td>
              <td className="px-2 py-3">
                <div className="flex flex-wrap gap-1">
                  <ChangeRoleButton user={user} />
                  <BlockUserButton user={user} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChangeRoleButton({ user }: { user: AdminUserRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(user.role);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await changeUserRoleAction(user.id, role);
      if (!result.ok) {
        setError(result.error ?? "Ошибка");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" />}
      >
        Роль
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Изменить роль</DialogTitle>
          <DialogDescription>
            {user.email} — текущая роль: {ROLE_LABELS[user.role]}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
            <label
              key={r}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10"
            >
              <input
                type="radio"
                name={`role-${user.id}`}
                checked={role === r}
                onChange={() => setRole(r)}
              />
              {ROLE_LABELS[r]}
            </label>
          ))}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>
            Отмена
          </DialogClose>
          <Button disabled={pending || role === user.role} onClick={onConfirm}>
            {pending ? "Сохраняем…" : "Подтвердить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BlockUserButton({ user }: { user: AdminUserRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nextBlocked = !user.isBlocked;

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await setUserBlockedAction(user.id, nextBlocked);
      if (!result.ok) {
        setError(result.error ?? "Ошибка");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={user.isBlocked ? "outline" : "ghost"}
            size="sm"
            className={user.isBlocked ? undefined : "text-destructive"}
          />
        }
      >
        {user.isBlocked ? "Разблокировать" : "Блок"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {nextBlocked ? "Заблокировать пользователя?" : "Разблокировать?"}
          </DialogTitle>
          <DialogDescription>
            {user.email}
            {nextBlocked
              ? " не сможет войти в аккаунт."
              : " снова сможет войти."}
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>
            Отмена
          </DialogClose>
          <Button
            variant={nextBlocked ? "destructive" : "default"}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "…" : "Подтвердить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
