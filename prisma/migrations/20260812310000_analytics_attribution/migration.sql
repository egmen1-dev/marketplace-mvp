-- HOTFIX-UX-005: visitor + UTM attribution on analytics events

ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "visitorId" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "utmSource" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "utmMedium" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "utmContent" TEXT;

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_visitorId_createdAt_idx" ON "AnalyticsEvent"("visitorId", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_utmSource_createdAt_idx" ON "AnalyticsEvent"("utmSource", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_entityId_event_idx" ON "AnalyticsEvent"("entityId", "event");
