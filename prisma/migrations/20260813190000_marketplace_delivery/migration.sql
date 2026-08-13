-- CreateEnum
CREATE TYPE "ReturnRequestStatus" AS ENUM ('CREATED', 'APPROVED', 'REJECTED', 'COMPLETED');

-- AlterEnum
ALTER TYPE "DeliveryStatus" ADD VALUE 'READY_FOR_PICKUP';
ALTER TYPE "DeliveryStatus" ADD VALUE 'PICKED_UP';
ALTER TYPE "DeliveryStatus" ADD VALUE 'AT_PICKUP_POINT';
ALTER TYPE "DeliveryStatus" ADD VALUE 'FAILED';

-- CreateTable
CREATE TABLE "return_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "reason" TEXT,
    "status" "ReturnRequestStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "return_requests_orderId_idx" ON "return_requests"("orderId");
CREATE INDEX "return_requests_buyerId_idx" ON "return_requests"("buyerId");
CREATE INDEX "return_requests_sellerId_idx" ON "return_requests"("sellerId");
CREATE INDEX "return_requests_status_idx" ON "return_requests"("status");

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
