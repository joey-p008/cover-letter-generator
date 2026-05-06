const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function stripJsonFences(text) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

// ─── Scoring helpers ─────────────────────────────────────────────────────────

const LEVEL_RANK = { Entry: 0, Junior: 1, Mid: 2, Senior: 3, Staff: 4, Principal: 5, Director: 6 };

function scoreExperience(candidateLevel, requiredLevel) {
  const c = LEVEL_RANK[candidateLevel] ?? null;
  const r = LEVEL_RANK[requiredLevel] ?? null;
  if (c === null || r === null) return null;
  const diff = c - r;
  if (diff === 0) return 100;
  if (diff === 1) return 85;
  if (diff === -1) return 70;
  if (diff === 2) return 60;
  if (diff === -2) return 40;
  return 15;
}

function skillMatches(candidateNormalized, skill) {
  const r = skill.toLowerCase().trim();
  return candidateNormalized.some(c => c === r || c.includes(r) || r.includes(c));
}

function scoreSkills(candidateSkills, requiredSkills, preferredSkills, bonusSkills) {
  const scoredSkills = [...(requiredSkills || []), ...(preferredSkills || [])];
  const bonus = bonusSkills || [];

  if (scoredSkills.length === 0) {
    return { score: null, matched: [], missing: [], bonusMatched: [], bonusMissing: bonus };
  }

  const normalized = (candidateSkills || []).map(s => s.toLowerCase().trim());

  const matched = [];
  const missing = [];
  for (const skill of scoredSkills) {
    if (skillMatches(normalized, skill)) matched.push(skill);
    else missing.push(skill);
  }

  const bonusMatched = [];
  const bonusMissing = [];
  for (const skill of bonus) {
    if (skillMatches(normalized, skill)) bonusMatched.push(skill);
    else bonusMissing.push(skill);
  }

  const score = normalized.length === 0 ? 0 : Math.round((matched.length / scoredSkills.length) * 100);
  return { score, matched, missing, bonusMatched, bonusMissing };
}

function scoreSalary(salaryMin, salaryMax) {
  if (salaryMin === null && salaryMax === null) return null;
  const salary =
    salaryMin !== null && salaryMax !== null
      ? (salaryMin + salaryMax) / 2
      : salaryMin ?? salaryMax;
  if (salary <= 0) return 0;
  if (salary < 60_000) return Math.round((salary / 60_000) * 40);
  if (salary <= 80_000) return 100;
  if (salary <= 160_000) {
    const t = (salary - 80_000) / (160_000 - 80_000);
    return Math.round(100 - t * 80);
  }
  return 20;
}

const SF_BAY_AREA = [
  // San Francisco
  'san francisco', 'sf',
  // Peninsula
  'daly city', 'south san francisco', 'san bruno', 'burlingame', 'millbrae',
  'san mateo', 'belmont', 'san carlos', 'redwood city', 'menlo park',
  'palo alto', 'los altos', 'mountain view', 'sunnyvale', 'cupertino',
  'santa clara', 'foster city',
  // South Bay
  'san jose', 'milpitas', 'campbell', 'los gatos', 'saratoga', 'los altos hills',
  // East Bay
  'oakland', 'berkeley', 'emeryville', 'alameda', 'hayward', 'fremont',
  'newark', 'union city', 'livermore', 'pleasanton', 'dublin', 'san ramon',
  'walnut creek', 'concord', 'richmond', 'el cerrito',
  // North Bay
  'san rafael', 'novato', 'petaluma',
  // Generic terms
  'bay area', 'silicon valley', 'south bay', 'east bay', 'north bay',
];
const TIER_2 = [
  'los angeles', 'san diego', 'sacramento',
  'new york', 'nyc', 'brooklyn', 'manhattan',
  'seattle', 'bellevue', 'redmond',
  'austin',
];

function scoreLocation(location, isRemote) {
  if (isRemote) return 100;
  if (!location) return null;
  const n = location.toLowerCase();
  if (n.includes('remote')) return 100;
  if (SF_BAY_AREA.some(t => n.includes(t))) return 100;
  if (TIER_2.some(t => n.includes(t))) return 60;
  return 20;
}

function scoreRecency(datePosted) {
  if (!datePosted) return null;
  const posted = new Date(datePosted);
  if (isNaN(posted.getTime())) return null;
  const diffDays = Math.floor((Date.now() - posted) / 86_400_000);
  if (diffDays <= 0) return 100;
  if (diffDays <= 3) return 90;
  if (diffDays <= 7) return 80;
  if (diffDays <= 14) return 60;
  if (diffDays <= 30) return 40;
  return 20;
}

function scoreCompetitiveness(count) {
  if (count === null) return null;
  if (count < 10) return 100;
  if (count <= 50) return 80;
  if (count <= 100) return 60;
  if (count <= 200) return 40;
  return 20;
}

const WEIGHTS = {
  experience: 0.25,
  skills: 0.30,
  salary: 0.20,
  location: 0.15,
  recency: 0.05,
  competitiveness: 0.05,
};

function computeOverall(scores) {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const s = scores[key];
    if (s !== null && s !== undefined) {
      totalWeight += weight;
      weightedSum += s * weight;
    }
  }
  if (totalWeight === 0) return null;
  return Math.round(weightedSum / totalWeight);
}

// ─── Claude extraction calls ─────────────────────────────────────────────────

async function extractJobData(jobPostingText) {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 700,
    system: `You are a job posting parser following the JOBSCRAPER skill rules. Extract structured information. Return ONLY valid JSON matching this schema — no markdown, no fences, no explanation:
{
  "experienceLevel": string | null,
  "requiredSkills": string[],
  "preferredSkills": string[],
  "bonusSkills": string[],
  "salaryMin": number | null,
  "salaryMax": number | null,
  "location": string | null,
  "isRemote": boolean,
  "datePosted": string | null,
  "applicantCount": number | null
}

experienceLevel must be one of: Entry, Junior, Mid, Senior, Staff, Principal, Director — or null.

Skill extraction rules (apply to all three skill arrays):
- Extract ONLY hard skills: programming languages, frameworks, tools, platforms, cloud services, databases, certifications, analytical methods, domain-specific technologies.
- DO NOT extract soft skills or personality traits (e.g. "communication", "team player", "fast learner", "motivated").
- Normalize technology names (e.g. "MS Excel" → "Excel", "Amazon Web Services" → "AWS").
- Each skill appears in exactly one array — no duplicates across arrays.

requiredSkills: skills from "Required", "Must have", "Minimum qualifications", "Mandatory", or "Need to have" sections.
preferredSkills: skills from "Preferred", "Nice to have", "Ideal candidate", "Desired", or "Plus" sections.
bonusSkills: skills from "Bonus", indirectly referenced adjacent tools, optional certifications, or domain familiarity not listed in required/preferred.
If the posting has no separate sections, put all technical skills in requiredSkills.

salaryMin/salaryMax in USD per year (annualize if hourly).
datePosted as ISO 8601 (YYYY-MM-DD) or null.
Only extract what is explicitly stated — do not guess.`,
    messages: [{ role: 'user', content: `JOB POSTING:\n${jobPostingText}\n\nExtract now.` }],
  });
  return JSON.parse(stripJsonFences(message.content[0].text));
}

async function extractCandidateData(resumeText) {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `You are a resume parser. Extract the candidate's experience level and skills. Return ONLY valid JSON — no markdown, no fences:
{
  "experienceLevel": string,
  "skills": string[]
}
experienceLevel must be one of: Entry, Junior, Mid, Senior, Staff, Principal, Director.
skills: all technical skills, tools, languages, frameworks, and methodologies from the resume.`,
    messages: [{ role: 'user', content: `RESUME:\n${resumeText}\n\nExtract now.` }],
  });
  return JSON.parse(stripJsonFences(message.content[0].text));
}

// ─── Main export ─────────────────────────────────────────────────────────────

async function scoreJobMatch(resumeText, jobPostingText) {
  const [jobData, candidateData] = await Promise.all([
    extractJobData(jobPostingText),
    extractCandidateData(resumeText),
  ]);

  const skillsResult = scoreSkills(
    candidateData.skills,
    jobData.requiredSkills,
    jobData.preferredSkills,
    jobData.bonusSkills,
  );

  const scores = {
    experience: scoreExperience(candidateData.experienceLevel, jobData.experienceLevel),
    skills: skillsResult.score,
    salary: scoreSalary(jobData.salaryMin, jobData.salaryMax),
    location: scoreLocation(jobData.location, jobData.isRemote),
    recency: scoreRecency(jobData.datePosted),
    competitiveness: scoreCompetitiveness(jobData.applicantCount),
  };

  const overall = computeOverall(scores);

  const breakdown = {};
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    breakdown[key] = {
      score: scores[key],
      weight,
      available: scores[key] !== null,
    };
  }

  return {
    overall,
    breakdown,
    jobData,
    candidateData,
    skillsBreakdown: {
      matched: skillsResult.matched,
      missing: skillsResult.missing,
      bonusMatched: skillsResult.bonusMatched,
      bonusMissing: skillsResult.bonusMissing,
    },
  };
}

module.exports = { scoreJobMatch };
