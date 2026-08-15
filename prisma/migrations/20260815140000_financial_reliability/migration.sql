-- CreateEnum
CREATE TYPE "FinancialIncidentSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "FinancialIncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'IGNORED');

-- CreateTable
CREATE TABLE "financial_audit_logs" (
    "id" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "userId" TEXT,
    "sellerId" TEXT,
    "orderId" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_incidents" (
    "id" TEXT NOT NULL,
    "severity" "FinancialIncidentSeverity" NOT NULL,
    "status" "FinancialIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cause" TEXT,
    "affectedSummary" TEXT,
    "remediation" TEXT,
    "operationType" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "financial_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_audit_logs_operationType_createdAt_idx" ON "financial_audit_logs"("operationType", "createdAt");

-- CreateIndex
CREATE INDEX "financial_audit_logs_idempotencyKey_idx" ON "financial_audit_logs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "financial_audit_logs_userId_idx" ON "financial_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "financial_incidents_severity_status_createdAt_idx" ON "financial_incidents"("severity", "status", "createdAt");

-- CreateIndex
CREATE INDEX "financial_incidents_operationType_idx" ON "financial_incidents"("operationType");
