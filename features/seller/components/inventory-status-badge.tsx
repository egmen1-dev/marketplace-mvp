import { Badge } from "@/components/ui/badge";
import {
  getInventoryAvailability,
  type InventoryAvailability,
} from "@/features/orders/lib/inventory-sync";
import { cn } from "@/lib/utils";

const LABELS: Record<InventoryAvailability, string> = {
  IN_STOCK: "В наличии",
  LOW: "Заканчивается",
  OUT: "Нет в наличии",
};

const STYLES: Record<InventoryAvailability, string> = {
  IN_STOCK: "border-emerald-500/40 text-emerald-800 dark:text-emerald-200",
  LOW: "border-amber-500/40 text-amber-800 dark:text-amber-200",
  OUT: "border-destructive/40 text-destructive",
};

export function InventoryStatusBadge({ quantity }: { quantity: number }) {
  const status = getInventoryAvailability(quantity);
  return (
    <Badge variant="outline" className={cn(STYLES[status])}>
      {LABELS[status]}
    </Badge>
  );
}
