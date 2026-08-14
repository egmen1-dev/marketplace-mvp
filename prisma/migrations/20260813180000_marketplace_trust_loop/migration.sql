-- MARKETPLACE-TRUST-LOOP-001 — reviews, ratings, moderation foundation

CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_FIX');
CREATE TYPE "ModerationItemType" AS ENUM ('PRODUCT', 'REVIEW', 'REPORT', 'CONTENT');

CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "pros" TEXT,
    "cons" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_photos" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_photos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_ratings" (
    "productId" TEXT NOT NULL,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "rating1" INTEGER NOT NULL DEFAULT 0,
    "rating2" INTEGER NOT NULL DEFAULT 0,
    "rating3" INTEGER NOT NULL DEFAULT 0,
    "rating4" INTEGER NOT NULL DEFAULT 0,
    "rating5" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_ratings_pkey" PRIMARY KEY ("productId")
);

CREATE TABLE "seller_reputations" (
    "sellerId" TEXT NOT NULL,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "cancellationRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "trustScore" INTEGER NOT NULL DEFAULT 0,
    "positiveSentiment" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_reputations_pkey" PRIMARY KEY ("sellerId")
);

CREATE TABLE "product_moderations" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "qualityScore" INTEGER,
    "issues" JSONB,
    "prohibitedHit" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_moderations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "moderation_queue_items" (
    "id" TEXT NOT NULL,
    "type" "ModerationItemType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "sellerId" TEXT,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "riskLevel" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_queue_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reviews_orderId_productId_buyerId_key" ON "reviews"("orderId", "productId", "buyerId");
CREATE INDEX "reviews_productId_idx" ON "reviews"("productId");
CREATE INDEX "reviews_sellerId_idx" ON "reviews"("sellerId");
CREATE INDEX "reviews_buyerId_idx" ON "reviews"("buyerId");
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

CREATE INDEX "review_photos_reviewId_idx" ON "review_photos"("reviewId");

CREATE UNIQUE INDEX "product_moderations_productId_key" ON "product_moderations"("productId");
CREATE INDEX "product_moderations_status_idx" ON "product_moderations"("status");

CREATE INDEX "moderation_queue_items_type_status_idx" ON "moderation_queue_items"("type", "status");
CREATE INDEX "moderation_queue_items_entityId_idx" ON "moderation_queue_items"("entityId");
CREATE INDEX "moderation_queue_items_sellerId_idx" ON "moderation_queue_items"("sellerId");

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "review_photos" ADD CONSTRAINT "review_photos_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_ratings" ADD CONSTRAINT "product_ratings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seller_reputations" ADD CONSTRAINT "seller_reputations_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_moderations" ADD CONSTRAINT "product_moderations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "moderation_queue_items" ADD CONSTRAINT "moderation_queue_items_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
