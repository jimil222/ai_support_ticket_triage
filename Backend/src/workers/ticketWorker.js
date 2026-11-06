const { prisma } = require('../config/database');
const { processTicket } = require('../services/triageService');

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 30000]; // Delays in milliseconds: 5s, 15s, 30s
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Reusable helper to pause execution for a specified duration in milliseconds.
 */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates the next ticket state after a processing failure or timeout.
 * Pure helper function: determines whether the ticket should retry or move
 * to "needs_review", calculates the backoff timestamp, and clears lockedAt.
 */
function calculateFailureState(retryCount) {
  if (retryCount < MAX_RETRIES) {
    const delayMs = RETRY_DELAYS[retryCount];
    return {
      status: 'retry_wait',
      retryCount: retryCount + 1,
      nextRetryAt: new Date(Date.now() + delayMs),
      lockedAt: null
    };
  }

  return {
    status: 'needs_review',
    retryCount: retryCount,
    nextRetryAt: null,
    lockedAt: null
  };
}

/**
 * Atomically claims the next eligible ticket for processing.
 *
 * Uses PostgreSQL row-level locking inside an interactive transaction to ensure that multiple concurrent workers never
 * pick up or process the same ticket.
 */
async function claimNextTicket() {
  return await prisma.$transaction(async (tx) => {
    // 1. Select the oldest eligible ticket and lock the row
    const tickets = await tx.$queryRaw`
      SELECT id
      FROM "tickets"
      WHERE status = 'pending'::"TicketStatus"
         OR (
           status = 'retry_wait'::"TicketStatus"
           AND next_retry_at IS NOT NULL
           AND next_retry_at <= NOW()
         )
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
    `;

    // 2. If no ticket is eligible, return null
    if (!tickets || tickets.length === 0) {
      return null;
    }

    const ticketId = tickets[0].id;

    // 3. Mark the claimed ticket as processing and set locked_at timestamp
    const claimedTicket = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'processing',
        lockedAt: new Date()
      }
    });

    return claimedTicket;
  });
}

/**
 * Handles a ticket when its processing fails while the worker is running.
 * Schedules another attempt after a delay or moves the ticket to
 * "needs_review" if the maximum retry limit is reached.
 */
async function handleTicketFailure(ticket, error) {
  console.error(`Handling failure for ticket ${ticket.id}:`, error.message);

  const updateData = calculateFailureState(ticket.retryCount);

  if (updateData.status === 'retry_wait') {
    const delayMs = RETRY_DELAYS[ticket.retryCount];
    console.log(
      `Scheduling retry ${updateData.retryCount}/${MAX_RETRIES} for ticket ${ticket.id} in ${delayMs / 1000}s (at ${updateData.nextRetryAt.toISOString()})`
    );
  } else {
    console.warn(
      `Ticket ${ticket.id} reached maximum retries (${MAX_RETRIES}). Moving status to needs_review.`
    );
  }

  // Atomically update only if ticket is still in 'processing' status
  const updateResult = await prisma.ticket.updateMany({
    where: {
      id: ticket.id,
      status: 'processing'
    },
    data: updateData
  });

  if (updateResult.count === 0) {
    console.warn(
      `Ticket ${ticket.id} status was not updated: state is no longer "processing".`
    );
  }
}

/**
 * Finds tickets that have been stuck in "processing" for too long,
 * usually because a worker crashed unexpectedly.
 * Schedules them for retry or moves them to "needs_review"
 * if the maximum retry limit is reached.
 */
async function recoverAbandonedTickets() {
  return await prisma.$transaction(async (tx) => {
    const cutoffTime = new Date(Date.now() - LOCK_TIMEOUT_MS);

    // Find tickets that have been stuck in processing for too long (or missing locked_at)
    const abandonedTickets = await tx.$queryRaw`
      SELECT id, retry_count
      FROM "tickets"
      WHERE status = 'processing'::"TicketStatus"
        AND (locked_at IS NULL OR locked_at < ${cutoffTime})
      ORDER BY locked_at ASC NULLS FIRST
      LIMIT 10
      FOR UPDATE SKIP LOCKED;
    `;

    for (const ticket of abandonedTickets) {
      const updateData = calculateFailureState(ticket.retry_count);

      await tx.ticket.update({
        where: { id: ticket.id },
        data: updateData
      });

      console.log(`Recovered abandoned ticket: ${ticket.id} (status: ${updateData.status})`);
    }

    return abandonedTickets.length;
  });
}

async function processNextTicket() {
  const ticket = await claimNextTicket();

  if (!ticket) {
    return false;
  }

  try {
    console.log(`Processing ticket: ${ticket.id} and email : ${ticket.customerEmail}`);

    await processTicket(ticket);

    console.log(`Ticket completed: ${ticket.id} and email : ${ticket.customerEmail}`);

    return true;
  } catch (error) {
    console.error(`Failed to process ticket ${ticket.id}:`, error.message);

    await handleTicketFailure(ticket, error);

    return false;
  }
}

/**
 * Continuous background worker loop.
 */
async function runWorker() {
  console.log('Ticket worker started...');

  while (true) {
    try {
      await recoverAbandonedTickets();

      const processed = await processNextTicket();

      // If no ticket was processed, wait 2 seconds
      if (!processed) {
        await wait(2000);
      }
      // If processed is true, the loop immediately continues to the next iteration
    } catch (error) {
      console.error('Worker error:', error.message);
      await wait(2000);
    }
  }
}

// Start worker if run directly from terminal
if (require.main === module) {
  runWorker();
}

module.exports = {
  claimNextTicket,
  processNextTicket,
  handleTicketFailure,
  recoverAbandonedTickets,
  calculateFailureState,
  runWorker,
  MAX_RETRIES,
  RETRY_DELAYS,
  LOCK_TIMEOUT_MS
};
