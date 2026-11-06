const fakeProvider = require('./fakeProvider');
const groqProvider = require('./groqProvider');

/**
 * Resolves the active provider function based on LLM_PROVIDER.
 * Defaults to "fake" if not set. Throws an error for unsupported values.
 */
function getSelectedProvider() {
  const provider = (process.env.LLM_PROVIDER || 'fake').toLowerCase().trim();

  if (provider === 'fake') {
    return fakeProvider.analyzeTicket;
  }

  if (provider === 'groq') {
    return groqProvider.analyzeTicket;
  }

  throw new Error(
    `Unsupported LLM provider: "${provider}". Supported providers are "fake" and "groq".`
  );
}

/**
 * Main entry point for ticket triage analysis.
 * Forwards the ticket to the selected LLM provider.
 */
async function analyzeTicket(ticket) {
  const analyze = getSelectedProvider();
  return await analyze(ticket);
}

module.exports = {
  analyzeTicket
};

