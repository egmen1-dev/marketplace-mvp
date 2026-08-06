-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('PICKUP', 'COURIER');

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "method" "DeliveryMethod" NOT NULL DEFAULT 'COURIER',
ADD COLUMN     "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'RUB',
ADD COLUMN     "pickupPointId" TEXT,
ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "estimatedMinDays" INTEGER,
ADD COLUMN     "estimatedMaxDays" INTEGER;

-- CreateIndex
CREATE INDEX "deliveries_method_idx" ON "deliveries"("method");
