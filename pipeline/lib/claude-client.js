import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5';
const MAX_RETRIES = 3;

let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    client = new Anthropic({ apiKey, maxRetries: MAX_RETRIES });
  }
  return client;
}

/**
 * Send a prompt to Claude and get a text response.
 * @param {object} opts
 * @param {string} opts.system - System prompt
 * @param {string} opts.userMessage - User message
 * @param {number} [opts.maxTokens=4096] - Max output tokens
 * @returns {Promise<string>} The text response
 */
export async function ask({ system, userMessage, maxTokens = 4096 }) {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userMessage }],
  });
  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock?.text ?? '';
}

/**
 * Send a prompt to Claude and parse the response as JSON.
 * Strips markdown code fences if present.
 * @param {object} opts - Same as `ask`
 * @returns {Promise<any>} Parsed JSON
 */
export async function askJSON(opts) {
  const text = await ask(opts);
  // Strip markdown code fences
  const cleaned = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '');
  return JSON.parse(cleaned);
}
