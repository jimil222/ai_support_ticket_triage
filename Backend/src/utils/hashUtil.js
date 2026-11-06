const crypto = require('crypto');

/**
 * Generates a deterministic 64-character SHA-256 hash for ticket triage caching.
 *
 * Combines normalized subject, body, model identifier, and prompt version
 * so that identical requests produce the exact same key, while changes to content,
 * model, or prompt template automatically produce a distinct key.
 */
function generateTriageCacheKey(ticket, model, promptVersion = 'v1') {
  if (!ticket || typeof ticket.subject !== 'string' || typeof ticket.body !== 'string') {
    throw new Error('Ticket subject and body must be valid strings to generate a cache key.');
  }

  const resolvedModel = model || process.env.GROQ_MODEL || process.env.LLM_PROVIDER || 'fake';

  const normalizedSubject = ticket.subject.trim().toLowerCase();
  const normalizedBody = ticket.body.trim().toLowerCase();
  const normalizedModel = resolvedModel.trim().toLowerCase();
  const normalizedVersion = promptVersion.trim().toLowerCase();

  const payload = `${normalizedSubject}|${normalizedBody}|${normalizedModel}|${normalizedVersion}`;

  return crypto.createHash('sha256').update(payload).digest('hex');
}

module.exports = {
  generateTriageCacheKey
};

