-- CreateEnum
CREATE TYPE "SellerKind" AS ENUM ('SHOP', 'INDIVIDUAL');

-- AlterTable
ALTER TABLE "seller_profiles" ADD COLUMN "kind" "SellerKind" NOT NULL DEFAULT 'SHOP';

-- CreateIndex
CREATE INDEX "seller_profiles_kind_idx" ON "seller_profiles"("kind");

-- CreateIndex
CREATE INDEX "categories_isActive_idx" ON "categories"("isActive");
