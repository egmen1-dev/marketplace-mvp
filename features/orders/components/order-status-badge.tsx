import type { OrderStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
} from "@/features/orders/lib/status";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={ORDER_STATUS_VARIANTS[status]}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
