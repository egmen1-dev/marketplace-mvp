"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductStatus } from "@prisma/client";
import { EyeOff, CheckCircle2, Trash2 } from "lucide-react";

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
  deleteProductAdminAction,
  setProductStatusAction,
} from "@/features/admin/actions";

type ProductModerationActionsProps = {
  productId: string;
  productName: string;
  status: ProductStatus;
  hasOrders: boolean;
};

export function ProductModerationActions({
  productId,
  productName,
  status,
  hasOrders,
}: ProductModerationActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function setStatus(next: ProductStatus) {
    setError(null);
    startTransition(async () => {
      const result = await setProductStatusAction(productId, next);
      if (!result.ok) {
        setError(result.error ?? "Ошибка");
        return;
      }
      router.refresh();
    });
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteProductAdminAction(productId);
      if (!result.ok) {
        setError(result.error ?? "Ошибка удаления");
        return;
      }
      setDeleteOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {status !== ProductStatus.ACTIVE ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setStatus(ProductStatus.ACTIVE)}
          >
            <CheckCircle2 data-icon="inline-start" />
            Активировать
          </Button>
        ) : null}
        {status !== ProductStatus.ARCHIVED ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setStatus(ProductStatus.ARCHIVED)}
          >
            <EyeOff data-icon="inline-start" />
            Скрыть
          </Button>
        ) : null}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={pending}
              />
            }
          >
            <Trash2 data-icon="inline-start" />
            Удалить
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Удалить товар?</DialogTitle>
              <DialogDescription>
                «{productName}»
                {hasOrders
                  ? " — есть в заказах, будет архивирован вместо удаления."
                  : " будет удалён безвозвратно."}
              </DialogDescription>
            </DialogHeader>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" disabled={pending} />}
              >
                Отмена
              </DialogClose>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={onDelete}
              >
                {pending ? "…" : hasOrders ? "Архивировать" : "Удалить"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
