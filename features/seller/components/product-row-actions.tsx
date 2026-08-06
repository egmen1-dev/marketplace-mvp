"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  archiveProductAction,
  duplicateProductAction,
} from "@/features/seller/actions";
import { sellerProductEditPath } from "@/lib/constants";
import { TOAST, toastError } from "@/lib/toasts";

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

  if (isArchived) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await archiveProductAction(productId);
          if (!result.ok) {
            toastError(result.error);
            return;
          }
          toast.success(TOAST.PRODUCT_ARCHIVED);
          router.refresh();
        });
      }}
    >
      <Archive data-icon="inline-start" />
      Архив
    </Button>
  );
}

export function DuplicateProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await duplicateProductAction(productId);
          if (!result.ok) {
            toastError(result.error);
            return;
          }
          toast.success(TOAST.PRODUCT_SAVED);
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
  );
}
