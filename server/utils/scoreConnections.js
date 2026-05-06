const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXPECTED_HEADERS = ['first name', 'last name', 'company', 'position'];

function findHeaderRowIndex(lines) {
  return lines.findIndex(line => {
    const lower = line.toLowerCase();
    return EXPECTED_HEADERS.every(h => lower.includes(h));
  });
}

function stripJsonFences(text) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

function parseCSVRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

function companyMatches(csvCompany, targetCompany) {
  const csv = csvCompany.toLowerCase().trim();
  const target = targetCompany.toLowerCase().trim();
  if (!csv || !target || target.length < 2) return false;
  if (csv.includes(target) || target.includes(csv)) return true;
  // Match on first significant word to handle "Stripe" vs "Stripe, Inc."
  const csvFirst = csv.split(/[\s,.(]/)[0];
  const targetFirst = target.split(/[\s,.(]/)[0];
  if (targetFirst.length >= 3 && (csv.includes(targetFirst) || targetFirst.includes(csvFirst))) return true;
  return false;
}

async function extractCompanyName(jobPostingText) {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 30,
    messages: [{
      role: 'user',
      content: `Extract only the company name from this job posting. Return just the company name and nothing else.\n\n${jobPostingText}`,
    }],
  });
  return message.content[0].text.trim();
}

async function scoreConnections(csvText, jobPostingText) {
  const lines = csvText.split('\n');
  const headerIndex = findHeaderRowIndex(lines);

  if (headerIndex === -1) {
    throw new Error(
      'The uploaded file does not appear to be a LinkedIn connections CSV. ' +
      'Expected columns: First Name, Last Name, LinkedIn URL, Email Address, Company, Position, Connected On. ' +
      'Export your connections from LinkedIn → Settings → Data Privacy → Get a copy of your data.'
    );
  }

  const headerLine = lines[headerIndex];
  const headers = parseCSVRow(headerLine).map(h => h.toLowerCase().trim());
  const companyIdx = headers.findIndex(h => h === 'company');

  // Extract company name with Haiku (fast, cheap), then filter CSV in JS
  const companyName = await extractCompanyName(jobPostingText);

  const dataLines = lines.slice(headerIndex + 1).filter(line => line.trim());
  const matchingLines = companyIdx === -1
    ? dataLines
    : dataLines.filter(line => {
        const fields = parseCSVRow(line);
        return companyMatches(fields[companyIdx] || '', companyName);
      });

  if (matchingLines.length === 0) return [];

  // Only send the matching rows to Claude for relevance scoring
  const filteredCsv = [headerLine, ...matchingLines].join('\n');

  const system = `You are a professional networking advisor. You will be given a small list of LinkedIn connections (as CSV) who all work at the target company, and a job posting.

The CSV columns are: First Name, Last Name, LinkedIn URL, Email Address, Company, Position, Connected On.

Your task: For each connection, score their relevance to the role on a scale of 0–100 using these criteria:
   - Title similarity to the job role (0–40 pts): same function (engineering, product, design, etc.)? Peer, manager, or adjacent team member?
   - Seniority match (0–30 pts): could they influence hiring? Senior ICs, managers, directors, and VPs in the relevant function score highest.
   - Department/team alignment (0–30 pts): same or closely related department scores highest; unrelated departments score low.

OUTPUT RULES:
- Return ONLY a valid JSON array. No markdown, no code fences, no explanation.
- Sort by score descending.

JSON schema for each element:
{
  "firstName": string,
  "lastName": string,
  "email": string,
  "linkedinUrl": string,
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
        content: `JOB POSTING:\n${jobPostingText}\n\nLINKEDIN CONNECTIONS AT THE COMPANY:\n${filteredCsv}\n\nReturn the JSON array now.`,
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
