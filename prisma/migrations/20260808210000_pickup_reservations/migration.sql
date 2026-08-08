-- CreateEnum
CREATE TYPE "OrderFulfillmentType" AS ENUM ('DELIVERY', 'SELLER_PICKUP');

-- CreateEnum
CREATE TYPE "PickupReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN "pickupEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "reservationEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "prepaymentPercent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "fulfillmentType" "OrderFulfillmentType" NOT NULL DEFAULT 'DELIVERY';

-- CreateTable
CREATE TABLE "pickup_points" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT,
    "phone" TEXT,
    "workingHours" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pickup_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_pickup_points" (
    "productId" TEXT NOT NULL,
    "pickupPointId" TEXT NOT NULL,

    CONSTRAINT "product_pickup_points_pkey" PRIMARY KEY ("productId","pickupPointId")
);

-- CreateTable
CREATE TABLE "pickup_reservations" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "pickupPointId" TEXT NOT NULL,
    "status" "PickupReservationStatus" NOT NULL DEFAULT 'PENDING',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "prepaymentPercent" INTEGER NOT NULL DEFAULT 0,
    "prepaymentAmount" DECIMAL(12,2) NOT NULL,
    "remainingAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pickup_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pickup_points_sellerId_idx" ON "pickup_points"("sellerId");
CREATE INDEX "pickup_points_sellerId_isActive_idx" ON "pickup_points"("sellerId", "isActive");
CREATE INDEX "pickup_points_city_idx" ON "pickup_points"("city");
CREATE INDEX "product_pickup_points_pickupPointId_idx" ON "product_pickup_points"("pickupPointId");
CREATE INDEX "pickup_reservations_orderId_idx" ON "pickup_reservations"("orderId");
CREATE INDEX "pickup_reservations_productId_idx" ON "pickup_reservations"("productId");
CREATE INDEX "pickup_reservations_buyerId_idx" ON "pickup_reservations"("buyerId");
CREATE INDEX "pickup_reservations_sellerId_idx" ON "pickup_reservations"("sellerId");
CREATE INDEX "pickup_reservations_pickupPointId_idx" ON "pickup_reservations"("pickupPointId");
CREATE INDEX "pickup_reservations_status_idx" ON "pickup_reservations"("status");
CREATE INDEX "pickup_reservations_createdAt_idx" ON "pickup_reservations"("createdAt");
CREATE INDEX "products_pickupEnabled_idx" ON "products"("pickupEnabled");
CREATE INDEX "orders_fulfillmentType_idx" ON "orders"("fulfillmentType");

-- AddForeignKey
ALTER TABLE "pickup_points" ADD CONSTRAINT "pickup_points_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_pickup_points" ADD CONSTRAINT "product_pickup_points_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_pickup_points" ADD CONSTRAINT "product_pickup_points_pickupPointId_fkey" FOREIGN KEY ("pickupPointId") REFERENCES "pickup_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pickup_reservations" ADD CONSTRAINT "pickup_reservations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pickup_reservations" ADD CONSTRAINT "pickup_reservations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_reservations" ADD CONSTRAINT "pickup_reservations_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_reservations" ADD CONSTRAINT "pickup_reservations_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_reservations" ADD CONSTRAINT "pickup_reservations_pickupPointId_fkey" FOREIGN KEY ("pickupPointId") REFERENCES "pickup_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
