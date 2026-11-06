-- CreateTable
CREATE TABLE "triage_cache" (
    "id" UUID NOT NULL,
    "cache_key" VARCHAR(64) NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triage_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "triage_cache_cache_key_key" ON "triage_cache"("cache_key");
