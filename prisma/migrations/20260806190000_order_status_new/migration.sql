-- Align OrderStatus with product requirements:
-- NEW, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED
-- (PENDING → NEW, drop REFUNDED)

CREATE TYPE "OrderStatus_new" AS ENUM (
  'NEW',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED'
);

ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "orders"
  ALTER COLUMN "status" TYPE "OrderStatus_new"
  USING (
    CASE status::text
      WHEN 'PENDING' THEN 'NEW'::"OrderStatus_new"
      WHEN 'REFUNDED' THEN 'CANCELLED'::"OrderStatus_new"
      ELSE status::text::"OrderStatus_new"
    END
  );

DROP TYPE "OrderStatus";

ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

ALTER TABLE "orders"
  ALTER COLUMN "status" SET DEFAULT 'NEW'::"OrderStatus";
