"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProductStockAction } from "@/features/seller/actions";
import { InventoryStatusBadge } from "@/features/seller/components/inventory-status-badge";
import { TOAST, toastError } from "@/lib/toasts";

type StockEditorProps = {
  productId: string;
  stock: number;
};

export function StockEditor({ productId, stock }: StockEditorProps) {
  const router = useRouter();
  const [value, setValue] = useState(String(stock));
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValue(String(stock));
  }, [stock]);

  function save() {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      toastError("Остаток не может быть отрицательным");
      setValue(String(stock));
      return;
    }
    if (parsed === stock) return;

    startTransition(async () => {
      const result = await updateProductStockAction(productId, parsed);
      if (!result.ok) {
        toastError(result.error);
        setValue(String(stock));
        return;
      }
      toast.success(TOAST.STOCK_UPDATED);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={0}
          step={1}
          value={value}
          disabled={pending}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="h-8 w-20 tabular-nums"
          aria-label="Остаток на складе"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={save}
          className="h-8 px-2 text-xs"
        >
          OK
        </Button>
      </div>
      <InventoryStatusBadge
        quantity={Math.max(0, Number.parseInt(value, 10) || 0)}
      />
    </div>
  );
}
