-- CreateEnum
CREATE TYPE "PromotionCampaignStatus" AS ENUM ('STARTED', 'PAUSED', 'ENDED');

-- CreateTable
CREATE TABLE "promotion_campaigns" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "PromotionCampaignStatus" NOT NULL DEFAULT 'STARTED',
    "budget" DECIMAL(12,2),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promotion_campaigns_productId_key" ON "promotion_campaigns"("productId");

-- CreateIndex
CREATE INDEX "promotion_campaigns_sellerId_idx" ON "promotion_campaigns"("sellerId");

-- CreateIndex
CREATE INDEX "promotion_campaigns_status_idx" ON "promotion_campaigns"("status");

-- CreateIndex
CREATE INDEX "promotion_campaigns_status_startedAt_idx" ON "promotion_campaigns"("status", "startedAt");

-- AddForeignKey
ALTER TABLE "promotion_campaigns" ADD CONSTRAINT "promotion_campaigns_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_campaigns" ADD CONSTRAINT "promotion_campaigns_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
