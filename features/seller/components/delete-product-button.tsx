"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

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
import { deleteProductAction } from "@/features/seller/actions";
import { ROUTES } from "@/lib/constants";
import { TOAST, toastError } from "@/lib/toasts";
import { toast } from "sonner";

type DeleteProductButtonProps = {
  productId: string;
  productTitle: string;
};

export function DeleteProductButton({
  productId,
  productTitle,
}: DeleteProductButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteProductAction(productId);
      if (!result.ok) {
        setError(result.error ?? "Не удалось удалить");
        toastError(result.error);
        return;
      }
      setOpen(false);
      toast.success(TOAST.PRODUCT_DELETED);
      router.push(ROUTES.SELLER_PRODUCTS);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
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
            «{productTitle}» будет удалён безвозвратно, включая изображения.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>
            Отмена
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Удаляем…" : "Удалить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
