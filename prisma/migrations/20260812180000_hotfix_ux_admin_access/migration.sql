-- HOTFIX-UX-001.3: grant ADMIN to designated operators (existing accounts only).
UPDATE "users"
SET "role" = 'ADMIN', "updatedAt" = CURRENT_TIMESTAMP
WHERE LOWER("email") IN (
  'nikitapetrovskih968@gmail.com',
  'egmen1@gmail.com'
);

-- Normalize legacy mixed-case emails so login works from any device/browser.
UPDATE "users"
SET "email" = LOWER("email"), "updatedAt" = CURRENT_TIMESTAMP
WHERE "email" <> LOWER("email");
