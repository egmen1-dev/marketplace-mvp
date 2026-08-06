import { ProductStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const LABELS: Record<ProductStatus, string> = {
  ACTIVE: "Активный",
  DRAFT: "Черновик",
  ARCHIVED: "В архиве",
  OUT_OF_STOCK: "Нет в наличии",
};

const VARIANT: Record<
  ProductStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  ACTIVE: "default",
  DRAFT: "secondary",
  ARCHIVED: "outline",
  OUT_OF_STOCK: "destructive",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <Badge variant={VARIANT[status]}>{LABELS[status]}</Badge>;
}
