-- Database Schema for AI Support Ticket Triage Service
-- PostgreSQL (Neon)

-- Enums
CREATE TYPE "TicketStatus" AS ENUM ('pending', 'processing', 'retry_wait', 'completed', 'needs_review');
CREATE TYPE "TicketCategory" AS ENUM ('billing', 'technical', 'account', 'feedback', 'other');
CREATE TYPE "TicketPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- Tickets Table
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

-- Triage Results Table (1-to-1 with Tickets)
CREATE TABLE "triage_results" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triage_results_pkey" PRIMARY KEY ("id")
);

-- Triage Cache Table (Result Caching by SHA-256 Hash)
CREATE TABLE "triage_cache" (
    "id" UUID NOT NULL,
    "cache_key" VARCHAR(64) NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triage_cache_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "tickets_status_idx" ON "tickets"("status");
CREATE INDEX "tickets_status_created_at_idx" ON "tickets"("status", "created_at");
CREATE INDEX "tickets_status_next_retry_at_idx" ON "tickets"("status", "next_retry_at");
CREATE UNIQUE INDEX "triage_results_ticket_id_key" ON "triage_results"("ticket_id");
CREATE UNIQUE INDEX "triage_cache_cache_key_key" ON "triage_cache"("cache_key");

-- Foreign Keys
ALTER TABLE "triage_results" ADD CONSTRAINT "triage_results_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
