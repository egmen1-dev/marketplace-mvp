-- AlterTable
ALTER TABLE "products" ADD COLUMN     "rankingScore" DOUBLE PRECISION DEFAULT 0;

-- CreateIndex
CREATE INDEX "products_rankingScore_idx" ON "products"("rankingScore");
