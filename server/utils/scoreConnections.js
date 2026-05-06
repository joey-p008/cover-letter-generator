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

function companyMatches(csvCompany, targetCompany) {
  const csv = csvCompany.toLowerCase().trim();
  const target = targetCompany.toLowerCase().trim();
  if (!csv || !target || target.length < 2) return false;
  if (csv.includes(target) || target.includes(csv)) return true;
  const csvFirst = csv.split(/[\s,.(]/)[0];
  const targetFirst = target.split(/[\s,.(]/)[0];
  if (targetFirst.length >= 3 && (csv.includes(targetFirst) || targetFirst.includes(csvFirst))) return true;
  return false;
}

function scoreTitle(title) {
  const t = (title || '').toLowerCase();
  if (/\b(chief|president|founder|co-founder|ceo|cto|cfo|coo|c[a-z]o)\b/.test(t)) return 95;
  if (/\b(vp|vice president|svp|evp)\b/.test(t)) return 90;
  if (/\bdirector\b/.test(t)) return 80;
  if (/\b(head of|manager|lead)\b/.test(t)) return 70;
  if (/\b(senior|staff|principal|sr\.?)\b/.test(t)) return 60;
  return 40;
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

  const idx = {
    firstName:   headers.findIndex(h => h.includes('first')),
    lastName:    headers.findIndex(h => h.includes('last')),
    company:     headers.findIndex(h => h === 'company'),
    position:    headers.findIndex(h => h === 'position'),
    linkedinUrl: headers.findIndex(h => h.includes('linkedin') || h.includes('url')),
    email:       headers.findIndex(h => h.includes('email')),
    connectedOn: headers.findIndex(h => h.includes('connected')),
  };

  const companyName = await extractCompanyName(jobPostingText);

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
        score:       scoreTitle(title),
      };
    })
    .sort((a, b) => b.score - a.score);
}

module.exports = { scoreConnections };
