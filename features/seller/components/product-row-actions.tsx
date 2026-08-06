"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  archiveProductAction,
  duplicateProductAction,
} from "@/features/seller/actions";
import { sellerProductEditPath } from "@/lib/constants";

type ProductRowActionsProps = {
  productId: string;
  isArchived: boolean;
};

export function ArchiveProductButton({
  productId,
  isArchived,
}: ProductRowActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isArchived) return null;

  return (
    <div className="inline-flex flex-col">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await archiveProductAction(productId);
            if (!result.ok) {
              setError(result.error ?? "Ошибка");
              return;
            }
            router.refresh();
          });
        }}
      >
        <Archive data-icon="inline-start" />
        Архив
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

export function DuplicateProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await duplicateProductAction(productId);
            if (!result.ok) {
              setError(result.error ?? "Ошибка");
              return;
            }
            if (result.newProductId) {
              router.push(sellerProductEditPath(result.newProductId));
            } else {
              router.refresh();
            }
          });
        }}
      >
        <Copy data-icon="inline-start" />
        Копия
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
