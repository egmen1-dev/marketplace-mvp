-- FINANCE_SCHEMA_RECONCILIATION_002
-- Align Prisma with existing staging PostgreSQL (columns already present from legacy migrations).
-- No destructive changes; 0 rows in finance_transactions at reconciliation time.

-- buyerId already nullable in DB; ensure FK still valid
ALTER TABLE "finance_transactions" ALTER COLUMN "buyerId" DROP NOT NULL;
