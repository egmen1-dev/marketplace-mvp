-- Improve moderation queue upsert lookups by (type, entityId)
CREATE INDEX IF NOT EXISTS "moderation_queue_items_type_entityId_idx"
ON "moderation_queue_items" ("type", "entityId");
