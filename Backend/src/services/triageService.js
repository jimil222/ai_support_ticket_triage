const { prisma } = require('../config/database');
const { CATEGORIES, PRIORITIES } = require('../constants/triageOptions');
const { analyzeTicket } = require('../providers/llmProvider');
const { generateTriageCacheKey } = require('../utils/hashUtil');
const { getCachedTriage, setCachedTriage } = require('./cacheService');

/**
 * Validates the raw triage data returned by the LLM.
 * Throws a clear error if any requirement fails.
 */
function validateTriageResult(data) {
  // 1. Ensure data is an object and not null or array
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('LLM response must be a valid JSON object.');
  }

  // 2. Category must be one of the allowed categories
  if (!data.category || !CATEGORIES.includes(data.category)) {
    throw new Error(
      `Invalid category: "${data.category}". Allowed categories are: ${CATEGORIES.join(', ')}`
    );
  }

  // 3. Priority must be one of the allowed priorities
  if (!data.priority || !PRIORITIES.includes(data.priority)) {
    throw new Error(
      `Invalid priority: "${data.priority}". Allowed priorities are: ${PRIORITIES.join(', ')}`
    );
  }

  // 4. Summary must be a non-empty string after trimming
  if (typeof data.summary !== 'string' || data.summary.trim().length === 0) {
    throw new Error('Summary must be a non-empty string.');
  }
}

/**
 * Processes a single ticket:
 * 1. Generates a cache key from ticket text, model, and prompt version.
 * 2. Checks PostgreSQL cache to avoid re-running the LLM for identical content.
 * 3. On cache miss: calls the LLM, validates output, and caches it.
 * 4. Atomically creates TriageResult and updates Ticket status to 'completed'.
 */
async function processTicket(ticket) {
  if (!ticket || !ticket.id || !ticket.subject || !ticket.body) {
    throw new Error('Ticket must include id, subject, and body.');
  }

  // 1. Generate deterministic cache key based on subject, body, model, and prompt
  const cacheKey = generateTriageCacheKey(ticket);

  // 2. Check if identical ticket content has already been triaged
  let triageData = await getCachedTriage(cacheKey);

  if (triageData) {
    console.log(`Cache Hit : Reusing cached triage result for ticket ${ticket.id}`);
  } else {
    // 3. On Cache Miss: Call the configured LLM provider (fake or groq)
    console.log(`Cache Miss : Calling LLM provider for ticket ${ticket.id}`);
    triageData = await analyzeTicket(ticket);

    // Validate the LLM output strictly
    validateTriageResult(triageData);

    // Save validated result to cache for future identical tickets
    await setCachedTriage(cacheKey, triageData);
  }

  // 4. Save TriageResult and update Ticket status in a single atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    const createdTriageResult = await tx.triageResult.create({
      data: {
        ticketId: ticket.id,
        category: triageData.category,
        priority: triageData.priority,
        summary: triageData.summary.trim()
      }
    });

    const updatedTicket = await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'completed',
        lockedAt: null,
        nextRetryAt: null
      }
    });

    return {
      triageResult: createdTriageResult,
      ticket: updatedTicket
    };
  });

  return result;
}

module.exports = {
  processTicket,
  validateTriageResult
};
