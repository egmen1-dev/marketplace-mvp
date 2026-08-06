-- AlterTable
ALTER TABLE "categories" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "categories_level_idx" ON "categories"("level");

-- CreateIndex
CREATE INDEX "categories_parentId_level_idx" ON "categories"("parentId", "level");
