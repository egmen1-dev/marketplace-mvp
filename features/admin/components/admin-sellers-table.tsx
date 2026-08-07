"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

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
  setSellerBlockedAction,
  setSellerVerifiedAction,
} from "@/features/admin/actions";
import type { AdminSellerRow } from "@/features/admin/queries";
import { sellerPublicPath } from "@/lib/constants";

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

export function AdminSellersTable({ sellers }: { sellers: AdminSellerRow[] }) {
  if (sellers.length === 0) {
    return (
      <p className="py-8 text-sm text-muted-foreground">Продавцов пока нет.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-2 py-2 font-medium">Магазин</th>
            <th className="px-2 py-2 font-medium">Владелец</th>
            <th className="px-2 py-2 font-medium">Email</th>
            <th className="px-2 py-2 font-medium">Товары</th>
            <th className="px-2 py-2 font-medium">Статус</th>
            <th className="px-2 py-2 font-medium">Регистрация</th>
            <th className="px-2 py-2 font-medium">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sellers.map((seller) => (
            <tr key={seller.id}>
              <td className="px-2 py-3 font-medium">{seller.storeName}</td>
              <td className="px-2 py-3">{seller.ownerName || "—"}</td>
              <td className="px-2 py-3 text-muted-foreground">
                {seller.ownerEmail}
              </td>
              <td className="px-2 py-3 tabular-nums">{seller.productCount}</td>
              <td className="px-2 py-3">
                <div className="flex flex-wrap gap-1">
                  {seller.isBlocked ? (
                    <Badge variant="destructive">Блок</Badge>
                  ) : null}
                  {seller.isVerified ? (
                    <Badge variant="default">Проверен</Badge>
                  ) : (
                    <Badge variant="outline">Не подтверждён</Badge>
                  )}
                </div>
              </td>
              <td className="px-2 py-3 tabular-nums text-muted-foreground">
                {formatDate(seller.createdAt)}
              </td>
              <td className="px-2 py-3">
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={
                      <Link
                        href={sellerPublicPath(seller.slug)}
                        target="_blank"
                      />
                    }
                  >
                    <ExternalLink data-icon="inline-start" />
                    Профиль
                  </Button>
                  <VerifySellerButton seller={seller} />
                  <BlockSellerButton seller={seller} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerifySellerButton({ seller }: { seller: AdminSellerRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = !seller.isVerified;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await setSellerVerifiedAction(seller.id, next);
          if (!result.ok) {
            toast.error(result.error ?? "Не удалось изменить статус");
            return;
          }
          toast.success(
            next ? "Продавец подтвержден" : "Подтверждение снято",
          );
          router.refresh();
        });
      }}
    >
      {seller.isVerified ? "Снять подтверждение" : "Подтвердить"}
    </Button>
  );
}

function BlockSellerButton({ seller }: { seller: AdminSellerRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nextBlocked = !seller.isBlocked;

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await setSellerBlockedAction(seller.id, nextBlocked);
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
            variant="ghost"
            size="sm"
            className={nextBlocked ? "text-destructive" : undefined}
          />
        }
      >
        {seller.isBlocked ? "Разблок" : "Блок"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {nextBlocked ? "Заблокировать продавца?" : "Разблокировать?"}
          </DialogTitle>
          <DialogDescription>
            «{seller.storeName}»
            {nextBlocked
              ? " будет скрыт с витрины."
              : " снова появится в каталоге."}
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
            Подтвердить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
