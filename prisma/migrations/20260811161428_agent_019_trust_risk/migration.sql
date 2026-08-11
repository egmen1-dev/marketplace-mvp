-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskEventStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "RiskEventSource" AS ENUM ('ORDERS', 'REVIEWS', 'RESERVATIONS', 'CHAT', 'PRODUCTS', 'AUTH', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RiskEventType" AS ENUM ('RAPID_ORDER_CREATION', 'RAPID_RESERVATION_CREATION', 'EXCESSIVE_CANCELLATIONS', 'EXCESSIVE_REJECTIONS', 'SUSPICIOUS_PRICE_DROP', 'PRICE_OUTLIER', 'DUPLICATE_LISTING', 'MULTIPLE_ACCOUNT_INDICATOR', 'REVIEW_ABUSE_INDICATOR', 'SELF_DEAL_INDICATOR', 'UNUSUAL_TRANSACTION_VALUE', 'FAILED_AUTH_PATTERN', 'CHAT_SPAM_PATTERN', 'SELLER_FULFILLMENT_DEGRADATION', 'BUYER_NO_SHOW_PATTERN');

-- CreateEnum
CREATE TYPE "RiskAccountStatus" AS ENUM ('NORMAL', 'WATCH', 'RESTRICTED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "risk_events" (
    "id" TEXT NOT NULL,
    "type" "RiskEventType" NOT NULL,
    "severity" "RiskSeverity" NOT NULL DEFAULT 'LOW',
    "source" "RiskEventSource" NOT NULL DEFAULT 'SYSTEM',
    "status" "RiskEventStatus" NOT NULL DEFAULT 'OPEN',
    "scoreDelta" INTEGER NOT NULL DEFAULT 0,
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "sourceEventId" TEXT,
    "userId" TEXT,
    "sellerId" TEXT,
    "productId" TEXT,
    "orderId" TEXT,
    "reservationId" TEXT,
    "conversationId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_audit_logs" (
    "id" TEXT NOT NULL,
    "riskEventId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_trust_stats" (
    "userId" TEXT NOT NULL,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "accountStatus" "RiskAccountStatus" NOT NULL DEFAULT 'NORMAL',
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "cancelledOrders" INTEGER NOT NULL DEFAULT 0,
    "completedReservations" INTEGER NOT NULL DEFAULT 0,
    "cancelledReservations" INTEGER NOT NULL DEFAULT 0,
    "riskEventCount" INTEGER NOT NULL DEFAULT 0,
    "highRiskEventCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_trust_stats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "seller_trust_stats" (
    "sellerId" TEXT NOT NULL,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "accountStatus" "RiskAccountStatus" NOT NULL DEFAULT 'NORMAL',
    "completedTransactions" INTEGER NOT NULL DEFAULT 0,
    "cancellationRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "avgRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "riskEventCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_trust_stats_pkey" PRIMARY KEY ("sellerId")
);

-- CreateTable
CREATE TABLE "product_risk_stats" (
    "productId" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "priceOutlierScore" INTEGER NOT NULL DEFAULT 0,
    "duplicateRiskScore" INTEGER NOT NULL DEFAULT 0,
    "sellerRiskContribution" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_risk_stats_pkey" PRIMARY KEY ("productId")
);

-- CreateIndex
CREATE UNIQUE INDEX "risk_events_sourceEventId_key" ON "risk_events"("sourceEventId");

-- CreateIndex
CREATE INDEX "risk_events_type_idx" ON "risk_events"("type");

-- CreateIndex
CREATE INDEX "risk_events_severity_idx" ON "risk_events"("severity");

-- CreateIndex
CREATE INDEX "risk_events_status_idx" ON "risk_events"("status");

-- CreateIndex
CREATE INDEX "risk_events_userId_idx" ON "risk_events"("userId");

-- CreateIndex
CREATE INDEX "risk_events_sellerId_idx" ON "risk_events"("sellerId");

-- CreateIndex
CREATE INDEX "risk_events_productId_idx" ON "risk_events"("productId");

-- CreateIndex
CREATE INDEX "risk_events_createdAt_idx" ON "risk_events"("createdAt");

-- CreateIndex
CREATE INDEX "risk_events_status_severity_idx" ON "risk_events"("status", "severity");

-- CreateIndex
CREATE INDEX "risk_audit_logs_riskEventId_idx" ON "risk_audit_logs"("riskEventId");

-- CreateIndex
CREATE INDEX "risk_audit_logs_actorUserId_idx" ON "risk_audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "risk_audit_logs_createdAt_idx" ON "risk_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "user_trust_stats_accountStatus_idx" ON "user_trust_stats"("accountStatus");

-- CreateIndex
CREATE INDEX "user_trust_stats_riskScore_idx" ON "user_trust_stats"("riskScore");

-- CreateIndex
CREATE INDEX "seller_trust_stats_accountStatus_idx" ON "seller_trust_stats"("accountStatus");

-- CreateIndex
CREATE INDEX "seller_trust_stats_riskScore_idx" ON "seller_trust_stats"("riskScore");

-- CreateIndex
CREATE INDEX "product_risk_stats_riskScore_idx" ON "product_risk_stats"("riskScore");
