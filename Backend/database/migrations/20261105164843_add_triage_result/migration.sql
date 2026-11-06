-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('billing', 'technical', 'account', 'feedback', 'other');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateTable
CREATE TABLE "triage_results" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triage_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "triage_results_ticket_id_key" ON "triage_results"("ticket_id");

-- AddForeignKey
ALTER TABLE "triage_results" ADD CONSTRAINT "triage_results_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
