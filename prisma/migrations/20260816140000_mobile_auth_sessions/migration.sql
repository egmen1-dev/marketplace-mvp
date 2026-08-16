-- Mobile auth refresh session registry
CREATE TABLE "mobile_auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceIdHash" TEXT,
    "refreshTokenHash" TEXT NOT NULL,
    "rotatedFromHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "mobile_auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mobile_auth_sessions_refreshTokenHash_key" ON "mobile_auth_sessions"("refreshTokenHash");
CREATE INDEX "mobile_auth_sessions_userId_idx" ON "mobile_auth_sessions"("userId");
CREATE INDEX "mobile_auth_sessions_revokedAt_idx" ON "mobile_auth_sessions"("revokedAt");

ALTER TABLE "mobile_auth_sessions" ADD CONSTRAINT "mobile_auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
