-- TRUST-SAFETY-001: Dispute foundation

CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'SELLER_RESPONSE', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER');
CREATE TYPE "DisputeReason" AS ENUM ('ITEM_NOT_MATCH', 'DAMAGED', 'NOT_RECEIVED', 'WRONG_ITEM');

CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "reason" "DisputeReason" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "disputes_orderId_idx" ON "disputes"("orderId");
CREATE INDEX "disputes_buyerUserId_idx" ON "disputes"("buyerUserId");
CREATE INDEX "disputes_sellerId_idx" ON "disputes"("sellerId");
CREATE INDEX "disputes_status_idx" ON "disputes"("status");
CREATE INDEX "disputes_createdAt_idx" ON "disputes"("createdAt");

ALTER TABLE "disputes" ADD CONSTRAINT "disputes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
