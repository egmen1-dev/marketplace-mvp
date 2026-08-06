"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  setSellerBlockedAction,
  setSellerVerifiedAction,
} from "@/features/admin/actions";

type SellerAdminActionsProps = {
  sellerId: string;
  isBlocked: boolean;
  isVerified: boolean;
};

export function SellerAdminActions({
  sellerId,
  isBlocked,
  isVerified,
}: SellerAdminActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);

  function toggleBlock() {
    setError(null);
    startTransition(async () => {
      const result = await setSellerBlockedAction(sellerId, !isBlocked);
      if (!result.ok) {
        setError(result.error ?? "Ошибка");
        return;
      }
      setBlockOpen(false);
      router.refresh();
    });
  }

  function toggleVerified() {
    setError(null);
    startTransition(async () => {
      const result = await setSellerVerifiedAction(sellerId, !isVerified);
      if (!result.ok) {
        setError(result.error ?? "Ошибка");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={toggleVerified}
      >
        {isVerified ? "Снять верификацию" : "Верифицировать"}
      </Button>
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogTrigger
          render={
            <Button
              variant={isBlocked ? "outline" : "destructive"}
              size="sm"
              disabled={pending}
            />
          }
        >
          {isBlocked ? "Разблокировать" : "Заблокировать"}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isBlocked ? "Разблокировать магазин?" : "Заблокировать магазин?"}
            </DialogTitle>
            <DialogDescription>
              {isBlocked
                ? "Магазин снова будет доступен."
                : "Заблокированный магазин скрыт из публичных листингов."}
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
              onClick={toggleBlock}
            >
              Подтвердить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
