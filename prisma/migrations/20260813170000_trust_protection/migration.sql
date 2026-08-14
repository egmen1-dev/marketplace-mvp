-- EPIC-TRUST-001 — Buyer protection & dispute foundation

-- Order lifecycle extension
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'AWAITING_BUYER_CONFIRMATION';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PROTECTION_PERIOD';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DISPUTE_OPEN';

ALTER TYPE "OrderEventType" ADD VALUE IF NOT EXISTS 'AWAITING_BUYER_CONFIRMATION';
ALTER TYPE "OrderEventType" ADD VALUE IF NOT EXISTS 'PROTECTION_PERIOD';
ALTER TYPE "OrderEventType" ADD VALUE IF NOT EXISTS 'DISPUTE_OPENED';

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "protectionEndsAt" TIMESTAMP(3);

-- Dispute enums
CREATE TYPE "DisputeReason" AS ENUM (
  'WRONG_ITEM',
  'DAMAGED',
  'NOT_AS_DESCRIBED',
  'NOT_RECEIVED'
);

CREATE TYPE "BuyerOrderConfirmationStatus" AS ENUM (
  'CONFIRMED',
  'REPORTED_ISSUE'
);

-- DisputeStatus renames (finance foundation)
ALTER TYPE "DisputeStatus" RENAME VALUE 'RESOLVED_BUYER' TO 'BUYER_WON';
ALTER TYPE "DisputeStatus" RENAME VALUE 'RESOLVED_SELLER' TO 'SELLER_WON';
ALTER TYPE "DisputeStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

-- Extend disputes table
ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "buyerId" TEXT;
ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "sellerId" TEXT;
ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "reason_new" "DisputeReason";

UPDATE "disputes" d
SET
  "buyerId" = COALESCE(d."buyerId", d."openedBy"),
  "reason_new" = 'NOT_AS_DESCRIBED'::"DisputeReason"
WHERE d."buyerId" IS NULL;

UPDATE "disputes" d
SET "sellerId" = oi."sellerId"
FROM (
  SELECT DISTINCT ON (oi."orderId")
    oi."orderId",
    p."sellerId"
  FROM "order_items" oi
  JOIN "products" p ON p."id" = oi."productId"
  ORDER BY oi."orderId", oi."id"
) oi
WHERE d."orderId" = oi."orderId" AND d."sellerId" IS NULL;

ALTER TABLE "disputes" DROP COLUMN IF EXISTS "reason";
ALTER TABLE "disputes" RENAME COLUMN "reason_new" TO "reason";

ALTER TABLE "disputes" ALTER COLUMN "buyerId" SET NOT NULL;
ALTER TABLE "disputes" ALTER COLUMN "sellerId" SET NOT NULL;
ALTER TABLE "disputes" ALTER COLUMN "reason" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "disputes_buyerId_idx" ON "disputes"("buyerId");
CREATE INDEX IF NOT EXISTS "disputes_sellerId_idx" ON "disputes"("sellerId");

ALTER TABLE "disputes" ADD CONSTRAINT "disputes_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Protection policy
CREATE TABLE IF NOT EXISTS "protection_policies" (
  "id" TEXT NOT NULL,
  "defaultProtectionDays" INTEGER NOT NULL DEFAULT 3,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "protection_policies_pkey" PRIMARY KEY ("id")
);

INSERT INTO "protection_policies" ("id", "defaultProtectionDays", "active", "updatedAt")
SELECT 'default-protection-policy', 3, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "protection_policies" WHERE "active" = true);

-- Buyer confirmation
CREATE TABLE IF NOT EXISTS "buyer_order_confirmations" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "status" "BuyerOrderConfirmationStatus" NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "buyer_order_confirmations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "buyer_order_confirmations_orderId_key"
  ON "buyer_order_confirmations"("orderId");
CREATE INDEX IF NOT EXISTS "buyer_order_confirmations_buyerId_idx"
  ON "buyer_order_confirmations"("buyerId");
CREATE INDEX IF NOT EXISTS "buyer_order_confirmations_status_idx"
  ON "buyer_order_confirmations"("status");

ALTER TABLE "buyer_order_confirmations" ADD CONSTRAINT "buyer_order_confirmations_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "buyer_order_confirmations" ADD CONSTRAINT "buyer_order_confirmations_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
