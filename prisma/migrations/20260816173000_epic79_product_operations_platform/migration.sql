-- EPIC-79 Product Operations Platform Wave 0

CREATE TYPE "ProductFlagStage" AS ENUM ('OFF', 'INTERNAL', 'ALPHA', 'BETA', 'PRODUCTION');
CREATE TYPE "ProductOpsSurface" AS ENUM ('WEB', 'MOBILE', 'ALL');

CREATE TABLE "product_flag_overrides" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "stage" "ProductFlagStage" NOT NULL DEFAULT 'OFF',
    "surface" "ProductOpsSurface" NOT NULL DEFAULT 'ALL',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_flag_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_flag_overrides_key_surface_key" ON "product_flag_overrides"("key", "surface");

CREATE TABLE "remote_config_entries" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "surface" "ProductOpsSurface" NOT NULL DEFAULT 'MOBILE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remote_config_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "remote_config_entries_key_surface_key" ON "remote_config_entries"("key", "surface");

CREATE TABLE "product_telemetry_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "surface" "ProductOpsSurface" NOT NULL DEFAULT 'MOBILE',
    "screen" TEXT,
    "sessionId" TEXT,
    "deviceIdHash" TEXT,
    "versionCode" INTEGER,
    "versionName" TEXT,
    "platform" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_telemetry_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_telemetry_events_eventType_createdAt_idx" ON "product_telemetry_events"("eventType", "createdAt");
CREATE INDEX "product_telemetry_events_sessionId_idx" ON "product_telemetry_events"("sessionId");
CREATE INDEX "product_telemetry_events_deviceIdHash_idx" ON "product_telemetry_events"("deviceIdHash");

CREATE TABLE "product_feedback_items" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'mobile',
    "userId" TEXT,
    "deviceIdHash" TEXT,
    "versionCode" INTEGER,
    "screen" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_feedback_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_feedback_items_classification_createdAt_idx" ON "product_feedback_items"("classification", "createdAt");

CREATE TABLE "product_session_steps" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "screen" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'view',
    "deviceIdHash" TEXT,
    "versionCode" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_session_steps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_session_steps_sessionId_stepOrder_idx" ON "product_session_steps"("sessionId", "stepOrder");

CREATE TABLE "product_experiments" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "variants" JSONB NOT NULL,
    "winner" TEXT,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_experiments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_experiments_key_key" ON "product_experiments"("key");

CREATE TABLE "product_ops_audit_events" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "actorId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_ops_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_ops_audit_events_entityKey_createdAt_idx" ON "product_ops_audit_events"("entityKey", "createdAt");
