"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";

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
  setUserBlockedAction,
  updateUserRoleAction,
} from "@/features/admin/actions";

const ROLES: UserRole[] = [UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN];

type UserRoleActionsProps = {
  userId: string;
  currentRole: UserRole;
  isBlocked: boolean;
  isSelf: boolean;
};

export function UserRoleActions({
  userId,
  currentRole,
  isBlocked,
  isSelf,
}: UserRoleActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [nextRole, setNextRole] = useState<UserRole>(currentRole);

  function applyRole() {
    setError(null);
    startTransition(async () => {
      const result = await updateUserRoleAction(userId, nextRole);
      if (!result.ok) {
        setError(result.error ?? "Не удалось изменить роль");
        return;
      }
      setRoleOpen(false);
      router.refresh();
    });
  }

  function applyBlock() {
    setError(null);
    startTransition(async () => {
      const result = await setUserBlockedAction(userId, !isBlocked);
      if (!result.ok) {
        setError(result.error ?? "Не удалось изменить статус");
        return;
      }
      setBlockOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogTrigger
          render={<Button variant="outline" size="sm" disabled={pending} />}
        >
          Роль
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Изменить роль</DialogTitle>
            <DialogDescription>
              Текущая роль: {currentRole}. Подтвердите смену.
            </DialogDescription>
          </DialogHeader>
          <select
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={nextRole}
            onChange={(e) => setNextRole(e.target.value as UserRole)}
            aria-label="Новая роль"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={pending} />}>
              Отмена
            </DialogClose>
            <Button
              disabled={pending || nextRole === currentRole}
              onClick={applyRole}
            >
              {pending ? "Сохраняем…" : "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogTrigger
          render={
            <Button
              variant={isBlocked ? "outline" : "destructive"}
              size="sm"
              disabled={pending || isSelf}
            />
          }
        >
          {isBlocked ? "Разблокировать" : "Заблокировать"}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isBlocked
                ? "Разблокировать пользователя?"
                : "Заблокировать пользователя?"}
            </DialogTitle>
            <DialogDescription>
              {isBlocked
                ? "Пользователь снова сможет войти."
                : "Заблокированный пользователь не сможет войти."}
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={pending} />}>
              Отмена
            </DialogClose>
            <Button
              variant={isBlocked ? "default" : "destructive"}
              disabled={pending}
              onClick={applyBlock}
            >
              {pending ? "…" : "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
