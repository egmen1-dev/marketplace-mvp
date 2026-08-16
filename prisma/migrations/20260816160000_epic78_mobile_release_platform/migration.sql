-- EPIC-78 Mobile Release Platform Wave 0

CREATE TYPE "MobileReleaseChannelId" AS ENUM ('INTERNAL', 'DEVELOPER', 'CLOSED_ALPHA', 'OPEN_ALPHA', 'BETA', 'RC', 'PRODUCTION');

CREATE TYPE "MobileReleaseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ROLLED_BACK', 'ARCHIVED');

CREATE TABLE "mobile_release_versions" (
    "id" TEXT NOT NULL,
    "versionName" TEXT NOT NULL,
    "versionCode" INTEGER NOT NULL,
    "gitCommit" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "channel" "MobileReleaseChannelId" NOT NULL DEFAULT 'CLOSED_ALPHA',
    "releaseNotes" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "minBackendVersion" TEXT NOT NULL DEFAULT 'mobile-v1',
    "minAppVersion" TEXT NOT NULL,
    "buildNumber" TEXT NOT NULL DEFAULT '1',
    "status" "MobileReleaseStatus" NOT NULL DEFAULT 'DRAFT',
    "downloadUrl" TEXT,
    "artifactSizeBytes" INTEGER,
    "rolloutPercent" INTEGER NOT NULL DEFAULT 100,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "packageId" TEXT NOT NULL DEFAULT 'ru.lot.marketplace.alpha',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_release_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mobile_release_versions_versionCode_key" ON "mobile_release_versions"("versionCode");
CREATE INDEX "mobile_release_versions_channel_status_idx" ON "mobile_release_versions"("channel", "status");
CREATE INDEX "mobile_release_versions_status_publishedAt_idx" ON "mobile_release_versions"("status", "publishedAt");

CREATE TABLE "mobile_release_testers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "deviceModel" TEXT,
    "androidVersion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_release_testers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mobile_release_testers_email_key" ON "mobile_release_testers"("email");

CREATE TABLE "mobile_release_tester_assignments" (
    "id" TEXT NOT NULL,
    "testerId" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mobile_release_tester_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mobile_release_tester_assignments_testerId_releaseId_key" ON "mobile_release_tester_assignments"("testerId", "releaseId");

CREATE TABLE "mobile_release_analytics_events" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT,
    "eventType" TEXT NOT NULL,
    "versionCode" INTEGER,
    "deviceIdHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mobile_release_analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mobile_release_analytics_events_eventType_createdAt_idx" ON "mobile_release_analytics_events"("eventType", "createdAt");
CREATE INDEX "mobile_release_analytics_events_releaseId_idx" ON "mobile_release_analytics_events"("releaseId");

ALTER TABLE "mobile_release_tester_assignments" ADD CONSTRAINT "mobile_release_tester_assignments_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "mobile_release_testers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mobile_release_tester_assignments" ADD CONSTRAINT "mobile_release_tester_assignments_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "mobile_release_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mobile_release_analytics_events" ADD CONSTRAINT "mobile_release_analytics_events_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "mobile_release_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
