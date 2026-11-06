const Groq = require('groq-sdk');
const { buildTriagePrompt } = require('../prompts/triagePrompt');

/**
 * Analyzes a ticket using the Groq API.
 * Builds the prompt, requests a JSON object, and returns the parsed result.
 */
async function analyzeTicket(ticket) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not configured.');
  }

  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  const groq = new Groq({ apiKey });

  const prompt = buildTriagePrompt(ticket);

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    model: model,
    response_format: { type: 'json_object' }
  });

  const content = completion.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Groq returned an empty response.');
  }

  const parsedResult = JSON.parse(content);
  return parsedResult;
}

module.exports = {
  analyzeTicket
};

