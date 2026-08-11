-- Order Lifecycle OMS: expand statuses, SLA fields, events, audit roles.

CREATE TYPE "OrderActorRole" AS ENUM ('BUYER', 'SELLER', 'ADMIN', 'SYSTEM', 'PAYMENT');

CREATE TYPE "OrderEventType" AS ENUM (
  'CREATED',
  'PAYMENT_RECORDED',
  'CONFIRMED',
  'REJECTED',
  'PROCESSING_STARTED',
  'READY_FOR_SHIPMENT',
  'SHIPPED',
  'IN_TRANSIT',
  'ARRIVED',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'RETURNED',
  'REFUNDED',
  'OVERDUE_MARKED',
  'SLA_UPDATED'
);

-- Recreate OrderStatus with full OMS set (safe inside a transaction).
CREATE TYPE "OrderStatus_new" AS ENUM (
  'NEW',
  'PAID',
  'AWAITING_SELLER_CONFIRMATION',
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_SHIPMENT',
  'SHIPPED',
  'IN_TRANSIT',
  'ARRIVED',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'RETURNED',
  'REFUNDED'
);

ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "order_status_history" ALTER COLUMN "fromStatus" DROP DEFAULT;
ALTER TABLE "order_status_history" ALTER COLUMN "toStatus" DROP DEFAULT;

ALTER TABLE "orders"
  ALTER COLUMN "status" TYPE "OrderStatus_new"
  USING (
    CASE status::text
      WHEN 'PAID' THEN 'AWAITING_SELLER_CONFIRMATION'::"OrderStatus_new"
      ELSE status::text::"OrderStatus_new"
    END
  );

ALTER TABLE "order_status_history"
  ALTER COLUMN "fromStatus" TYPE "OrderStatus_new"
  USING (
    CASE
      WHEN "fromStatus" IS NULL THEN NULL
      WHEN "fromStatus"::text = 'PAID' THEN 'AWAITING_SELLER_CONFIRMATION'::"OrderStatus_new"
      ELSE "fromStatus"::text::"OrderStatus_new"
    END
  );

ALTER TABLE "order_status_history"
  ALTER COLUMN "toStatus" TYPE "OrderStatus_new"
  USING (
    CASE
      WHEN "toStatus"::text = 'PAID' THEN 'AWAITING_SELLER_CONFIRMATION'::"OrderStatus_new"
      ELSE "toStatus"::text::"OrderStatus_new"
    END
  );

DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

ALTER TABLE "orders"
  ALTER COLUMN "status" SET DEFAULT 'NEW'::"OrderStatus";

-- Order SLA / completion fields
ALTER TABLE "orders"
  ADD COLUMN "handlingDays" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "confirmationDeadline" TIMESTAMP(3),
  ADD COLUMN "shipmentDeadline" TIMESTAMP(3),
  ADD COLUMN "pickupExpiresAt" TIMESTAMP(3),
  ADD COLUMN "estimatedDeliveryAt" TIMESTAMP(3),
  ADD COLUMN "isOverdue" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "overdueAt" TIMESTAMP(3),
  ADD COLUMN "reviewEligibleAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE INDEX "orders_isOverdue_idx" ON "orders"("isOverdue");
CREATE INDEX "orders_completedAt_idx" ON "orders"("completedAt");

-- History audit columns
ALTER TABLE "order_status_history"
  ADD COLUMN "performedByRole" "OrderActorRole" NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "reason" TEXT;

-- Domain events
CREATE TABLE "order_events" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" "OrderEventType" NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_events_orderId_idx" ON "order_events"("orderId");
CREATE INDEX "order_events_type_idx" ON "order_events"("type");
CREATE INDEX "order_events_createdAt_idx" ON "order_events"("createdAt");

ALTER TABLE "order_events"
  ADD CONSTRAINT "order_events_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
