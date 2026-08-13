-- ADS-MARKETPLACE-003 — Promotion analytics & ROI foundation

CREATE TABLE "promotion_metrics" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "productViews" INTEGER NOT NULL DEFAULT 0,
  "addToCart" INTEGER NOT NULL DEFAULT 0,
  "checkoutStarted" INTEGER NOT NULL DEFAULT 0,
  "orders" INTEGER NOT NULL DEFAULT 0,
  "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "promotion_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promotion_metrics_campaignId_date_key"
  ON "promotion_metrics"("campaignId", "date");
CREATE INDEX "promotion_metrics_campaignId_date_idx"
  ON "promotion_metrics"("campaignId", "date");
CREATE INDEX "promotion_metrics_productId_idx"
  ON "promotion_metrics"("productId");

ALTER TABLE "promotion_metrics" ADD CONSTRAINT "promotion_metrics_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "promotion_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_metrics" ADD CONSTRAINT "promotion_metrics_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "promotion_attributions" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "firstTouchAt" TIMESTAMP(3) NOT NULL,
  "lastTouchAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "promotion_attributions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promotion_attributions_campaignId_visitorId_key"
  ON "promotion_attributions"("campaignId", "visitorId");
CREATE INDEX "promotion_attributions_visitorId_productId_idx"
  ON "promotion_attributions"("visitorId", "productId");
CREATE INDEX "promotion_attributions_lastTouchAt_idx"
  ON "promotion_attributions"("lastTouchAt");

ALTER TABLE "promotion_attributions" ADD CONSTRAINT "promotion_attributions_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "promotion_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_attributions" ADD CONSTRAINT "promotion_attributions_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
