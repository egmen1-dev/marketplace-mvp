-- Catalog popularity + price index (TASK 013)

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "views" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "favoritesCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "products_price_idx" ON "products"("price");
CREATE INDEX IF NOT EXISTS "products_views_idx" ON "products"("views");
CREATE INDEX IF NOT EXISTS "products_favoritesCount_idx" ON "products"("favoritesCount");
