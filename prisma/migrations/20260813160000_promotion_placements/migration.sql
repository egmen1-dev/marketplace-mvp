-- ADS-MARKETPLACE-002: promotion distribution placements

CREATE TYPE "PromotionSurfaceType" AS ENUM (
  'HOME_FEATURED',
  'CATALOG_TOP',
  'CATEGORY_TOP',
  'SEARCH_BOOST'
);

CREATE TABLE "promotion_placements" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "surface" "PromotionSurfaceType" NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "promotion_placements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promotion_placements_campaignId_surface_key" ON "promotion_placements"("campaignId", "surface");
CREATE INDEX "promotion_placements_productId_idx" ON "promotion_placements"("productId");
CREATE INDEX "promotion_placements_surface_active_priority_idx" ON "promotion_placements"("surface", "active", "priority");

ALTER TABLE "promotion_placements" ADD CONSTRAINT "promotion_placements_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "promotion_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_placements" ADD CONSTRAINT "promotion_placements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
