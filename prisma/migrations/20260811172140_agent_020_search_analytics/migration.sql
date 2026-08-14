-- CreateTable
CREATE TABLE "search_query_logs" (
    "id" TEXT NOT NULL,
    "original" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "hasResults" BOOLEAN NOT NULL DEFAULT true,
    "intent" TEXT,
    "clickedProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_query_logs_normalized_idx" ON "search_query_logs"("normalized");

-- CreateIndex
CREATE INDEX "search_query_logs_hasResults_idx" ON "search_query_logs"("hasResults");

-- CreateIndex
CREATE INDEX "search_query_logs_createdAt_idx" ON "search_query_logs"("createdAt");
