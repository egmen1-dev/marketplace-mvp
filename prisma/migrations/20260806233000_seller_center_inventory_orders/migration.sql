-- Seller profile storefront fields
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "shippingDefaults" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "rating" DECIMAL(3,2) NOT NULL DEFAULT 0;

-- Product SEO / logistics fields
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weight" DECIMAL(10,3);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "lengthCm" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "widthCm" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "heightCm" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "seoDescription" TEXT;

CREATE INDEX IF NOT EXISTS "products_sellerId_idx" ON "products"("sellerId");
CREATE INDEX IF NOT EXISTS "products_createdAt_idx" ON "products"("createdAt");

CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt");

-- Product inventory (canonical quantity; Product.stock stays mirrored)
CREATE TABLE IF NOT EXISTS "product_inventories" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_inventories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_inventories_productId_key" ON "product_inventories"("productId");

-- Backfill inventory from existing Product.stock
INSERT INTO "product_inventories" ("id", "productId", "quantity", "reservedQuantity", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || p.id), p.id, p.stock, 0, CURRENT_TIMESTAMP
FROM "products" p
WHERE NOT EXISTS (
  SELECT 1 FROM "product_inventories" pi WHERE pi."productId" = p.id
);

DO $$ BEGIN
  ALTER TABLE "product_inventories" ADD CONSTRAINT "product_inventories_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "inventory_history" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    CONSTRAINT "inventory_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_history_productId_idx" ON "inventory_history"("productId");
CREATE INDEX IF NOT EXISTS "inventory_history_createdAt_idx" ON "inventory_history"("createdAt");
CREATE INDEX IF NOT EXISTS "inventory_history_actorUserId_idx" ON "inventory_history"("actorUserId");

DO $$ BEGIN
  ALTER TABLE "inventory_history" ADD CONSTRAINT "inventory_history_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "inventory_history" ADD CONSTRAINT "inventory_history_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "order_status_history" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "changedByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "order_status_history_orderId_idx" ON "order_status_history"("orderId");
CREATE INDEX IF NOT EXISTS "order_status_history_createdAt_idx" ON "order_status_history"("createdAt");
CREATE INDEX IF NOT EXISTS "order_status_history_changedByUserId_idx" ON "order_status_history"("changedByUserId");

DO $$ BEGIN
  ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changedByUserId_fkey"
    FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
