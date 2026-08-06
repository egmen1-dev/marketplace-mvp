-- AlterTable
ALTER TABLE "product_images" ADD COLUMN IF NOT EXISTS "pathname" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_images_pathname_idx" ON "product_images"("pathname");
