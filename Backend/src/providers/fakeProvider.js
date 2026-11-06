// Hardcoded responses for each allowed category
const mockResponses = {
  billing: {
    category: 'billing',
    priority: 'high',
    summary: 'Customer was charged but the order was not created.'
  },
  technical: {
    category: 'technical',
    priority: 'high',
    summary: 'Customer encountered a technical error or system malfunction.'
  },
  account: {
    category: 'account',
    priority: 'medium',
    summary: 'Customer requested assistance with account login or settings.'
  },
  feedback: {
    category: 'feedback',
    priority: 'low',
    summary: 'Customer submitted product feedback or a feature suggestion.'
  },
  other: {
    category: 'other',
    priority: 'low',
    summary: 'Customer submitted a general inquiry not matching standard categories.'
  }
};

/**
 * Simulates analyzing a ticket with an LLM without calling any external API.
 * Includes a short delay (500ms) to mimic network latency.
 */
async function analyzeTicket(ticket) {
  // Simulate LLM response time
  await new Promise((resolve) => setTimeout(resolve, 500));

  const text = `${ticket?.subject || ''} ${ticket?.body || ''}`.toLowerCase();

  if (text.includes('account') || text.includes('login') || text.includes('password')) {
    return mockResponses.account;
  }
  if (text.includes('tech') || text.includes('bug') || text.includes('error') || text.includes('crash')) {
    return mockResponses.technical;
  }
  if (text.includes('feedback') || text.includes('suggest') || text.includes('feature')) {
    return mockResponses.feedback;
  }
  if (text.includes('other') || text.includes('general')) {
    return mockResponses.other;
  }

  // Default sample result
  return mockResponses.billing;
}

module.exports = {
  analyzeTicket
};

// Function for simulating retry behaivour
// async function analyzeTicket(ticket) {
//   console.log('Fake LLM: Simulating provider failure...');

//   await new Promise((resolve) => setTimeout(resolve, 1000));

//   throw new Error('Simulated LLM provider failure');
// }

// module.exports = {
//   analyzeTicket
// };