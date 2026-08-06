-- AlterTable
ALTER TABLE "users" ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "seller_profiles" ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "admin_action_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_isBlocked_idx" ON "users"("isBlocked");

-- CreateIndex
CREATE INDEX "seller_profiles_isBlocked_idx" ON "seller_profiles"("isBlocked");

-- CreateIndex
CREATE INDEX "admin_action_logs_adminId_idx" ON "admin_action_logs"("adminId");

-- CreateIndex
CREATE INDEX "admin_action_logs_entityType_entityId_idx" ON "admin_action_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "admin_action_logs_createdAt_idx" ON "admin_action_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
