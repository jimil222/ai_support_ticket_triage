-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('pending', 'processing', 'retry_wait', 'completed', 'needs_review');

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "customer_email" VARCHAR(255) NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'pending',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMPTZ,
    "locked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_status_created_at_idx" ON "tickets"("status", "created_at");

-- CreateIndex
CREATE INDEX "tickets_status_next_retry_at_idx" ON "tickets"("status", "next_retry_at");

