const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXPECTED_HEADERS = ['first name', 'last name', 'company', 'position'];

function validateCsvHeaders(csvText) {
  const firstLine = csvText.split('\n').find(l => l.trim().length > 0) || '';
  const headers = firstLine.toLowerCase();
  return EXPECTED_HEADERS.every(h => headers.includes(h));
}

function stripJsonFences(text) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

async function scoreConnections(csvText, jobPostingText) {
  if (!validateCsvHeaders(csvText)) {
    throw new Error(
      'The uploaded file does not appear to be a LinkedIn connections CSV. ' +
      'Expected columns: First Name, Last Name, Email Address, Company, Position, Connected On.'
    );
  }

  const system = `You are a professional networking advisor. You will be given a list of LinkedIn connections (as CSV) and a job posting.

Your tasks:
1. Extract the company name from the job posting.
2. Find all connections whose "Company" field matches that company (case-insensitive, partial match allowed — e.g. "Stripe" matches "Stripe, Inc.").
3. For each matching connection, score their relevance to the role on a scale of 0–100 using these criteria:
   - Title similarity to the job role (0–40 pts): same function (engineering, product, design, etc.)? Peer, manager, or adjacent team member?
   - Seniority match (0–30 pts): could they influence hiring? Senior ICs, managers, directors, and VPs in the relevant function score highest.
   - Department/team alignment (0–30 pts): same or closely related department scores highest; unrelated departments score low.

OUTPUT RULES:
- Return ONLY a valid JSON array. No markdown, no code fences, no explanation.
- If no connections match, return: []
- Sort by score descending.
- Include only connections who work at the target company.

JSON schema for each element:
{
  "firstName": string,
  "lastName": string,
  "email": string,
  "title": string,
  "company": string,
  "connectedOn": string,
  "score": number,
  "rationale": string
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system,
    messages: [
      {
        role: 'user',
        content: `JOB POSTING:\n${jobPostingText}\n\nLINKEDIN CONNECTIONS CSV:\n${csvText}\n\nReturn the JSON array now.`,
      },
    ],
  });

  const raw = stripJsonFences(message.content[0].text);

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Failed to parse connections response from Claude. Raw: ' + raw.slice(0, 200));
  }
}

module.exports = { scoreConnections };
