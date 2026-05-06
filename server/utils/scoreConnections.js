const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXPECTED_HEADERS = ['first name', 'last name', 'company', 'position'];

function findHeaderRowIndex(lines) {
  return lines.findIndex(line => {
    const lower = line.toLowerCase();
    return EXPECTED_HEADERS.every(h => lower.includes(h));
  });
}

function parseCSVRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
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

function stripJsonFences(text) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

// Strip common legal suffixes so "Google LLC" and "Google" both normalize to "google".
const CORP_SUFFIXES = /\b(inc|llc|ltd|corp|co|company|group|holdings|international|technologies|technology|solutions|services|platform|platforms|pbc|gmbh|ag|sa|plc)\b\.?/gi;

function normalizeCompany(name) {
  return (name || '')
    .toLowerCase()
    .replace(CORP_SUFFIXES, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function companyMatches(csvCompany, targetCompany) {
  const csv = normalizeCompany(csvCompany);
  const target = normalizeCompany(targetCompany);
  if (!csv || !target || target.length < 2) return false;
  return csv === target;
}

// ─── Relevance scoring ────────────────────────────────────────────────────────

// Primary: how closely the connection's title matches the job's team/function.
function scoreFunctionRelevance(title, functionKeywords) {
  if (!functionKeywords || functionKeywords.length === 0) return 15;
  const t = (title || '').toLowerCase();
  const matchCount = functionKeywords.filter(kw => t.includes(kw.toLowerCase())).length;
  if (matchCount >= 2) return 60;
  if (matchCount === 1) return 45;
  return 15;
}

// Secondary: seniority / influence level within the company.
function scoreSeniority(title) {
  const t = (title || '').toLowerCase();
  if (/\b(chief|president|founder|co-founder|ceo|cto|cfo|coo|c[a-z]o)\b/.test(t)) return 40;
  if (/\b(vp|vice president|svp|evp)\b/.test(t)) return 38;
  if (/\bdirector\b/.test(t)) return 32;
  if (/\b(head of|manager|lead)\b/.test(t)) return 26;
  if (/\b(senior|staff|principal|sr\.?)\b/.test(t)) return 20;
  return 15;
}

// ─── Haiku extraction ─────────────────────────────────────────────────────────

async function extractJobContext(jobPostingText) {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    system: 'You are a job posting parser. Return ONLY valid JSON — no markdown, no fences, no explanation.',
    messages: [{
      role: 'user',
      content: `Extract the company name and function/team keywords from this job posting.

Return JSON exactly:
{"company": string, "functionKeywords": string[]}

functionKeywords: 3-6 short words describing the team/function (e.g. "engineering", "data science", "product", "marketing", "sales", "design", "finance"). These will be matched against LinkedIn job titles.

JOB POSTING:
${jobPostingText}`,
    }],
  });
  try {
    return JSON.parse(stripJsonFences(message.content[0].text));
  } catch {
    // If JSON parse still fails, treat the whole response as the company name
    return { company: message.content[0].text.trim(), functionKeywords: [] };
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

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

  const headers = parseCSVRow(lines[headerIndex]).map(h => h.toLowerCase().trim());

  const idx = {
    firstName:   headers.findIndex(h => h.includes('first')),
    lastName:    headers.findIndex(h => h.includes('last')),
    company:     headers.findIndex(h => h === 'company'),
    position:    headers.findIndex(h => h === 'position'),
    linkedinUrl: headers.findIndex(h => h.includes('linkedin') || h.includes('url')),
    email:       headers.findIndex(h => h.includes('email')),
    connectedOn: headers.findIndex(h => h.includes('connected')),
  };

  const { company: companyName, functionKeywords } = await extractJobContext(jobPostingText);

  return lines
    .slice(headerIndex + 1)
    .filter(line => line.trim())
    .filter(line => {
      if (idx.company === -1) return false;
      const fields = parseCSVRow(line);
      return companyMatches(fields[idx.company] || '', companyName);
    })
    .map(line => {
      const f = parseCSVRow(line);
      const title = f[idx.position] || '';
      return {
        firstName:   f[idx.firstName]   || '',
        lastName:    f[idx.lastName]    || '',
        email:       f[idx.email]       || '',
        linkedinUrl: f[idx.linkedinUrl] || '',
        title,
        company:     f[idx.company]     || '',
        connectedOn: f[idx.connectedOn] || '',
        score:       scoreFunctionRelevance(title, functionKeywords) + scoreSeniority(title),
      };
    })
    .sort((a, b) => b.score - a.score);
}

module.exports = { scoreConnections };
