-- OMS hardening: processing deadline + overdue reason

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "processingDeadline" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "overdueReason" TEXT;
