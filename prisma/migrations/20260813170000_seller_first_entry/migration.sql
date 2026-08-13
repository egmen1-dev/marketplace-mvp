CREATE TABLE "seller_experience_progress" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "currentStep" TEXT,
    "dismissedSteps" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_experience_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seller_experience_progress_sellerId_key" ON "seller_experience_progress"("sellerId");

ALTER TABLE "seller_experience_progress" ADD CONSTRAINT "seller_experience_progress_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
