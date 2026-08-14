-- ADS-MARKETPLACE-004 — Promotion billing foundation

CREATE TYPE "PromotionOrderStatus" AS ENUM (
  'CREATED',
  'PAYMENT_PENDING',
  'PAID',
  'ACTIVE',
  'ENDED',
  'CANCELLED'
);

CREATE TABLE "promotion_plans" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "price" DECIMAL(12,2) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "promotion_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promotion_plans_name_key" ON "promotion_plans"("name");

CREATE TABLE "promotion_orders" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "campaignId" TEXT,
  "status" "PromotionOrderStatus" NOT NULL DEFAULT 'CREATED',
  "amount" DECIMAL(12,2) NOT NULL,
  "stripeSessionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "promotion_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promotion_orders_stripeSessionId_key"
  ON "promotion_orders"("stripeSessionId");
CREATE INDEX "promotion_orders_sellerId_idx" ON "promotion_orders"("sellerId");
CREATE INDEX "promotion_orders_productId_idx" ON "promotion_orders"("productId");
CREATE INDEX "promotion_orders_planId_idx" ON "promotion_orders"("planId");
CREATE INDEX "promotion_orders_campaignId_idx" ON "promotion_orders"("campaignId");
CREATE INDEX "promotion_orders_status_idx" ON "promotion_orders"("status");
CREATE INDEX "promotion_orders_status_endedAt_idx"
  ON "promotion_orders"("status", "endedAt");

ALTER TABLE "promotion_orders" ADD CONSTRAINT "promotion_orders_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_orders" ADD CONSTRAINT "promotion_orders_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_orders" ADD CONSTRAINT "promotion_orders_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "promotion_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_orders" ADD CONSTRAINT "promotion_orders_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "promotion_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "promotion_plans" ("id", "name", "durationDays", "price", "active", "createdAt", "updatedAt")
VALUES
  ('plan_starter', 'STARTER', 7, 990.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_growth', 'GROWTH', 14, 1790.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_boost', 'BOOST', 30, 2990.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
