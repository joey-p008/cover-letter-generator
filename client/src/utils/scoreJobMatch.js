// Client-side port of server/utils/scoreJobMatch.js (pure scoring functions only — no API calls).
// Keep in sync with the server version when scoring rules change.

const LEVEL_RANK = { Entry: 0, Junior: 1, Mid: 2, Senior: 3, Staff: 4, Principal: 5, Director: 6 };

export function scoreExperience(candidateLevel, requiredLevel) {
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

// Client-side skills scoring uses already-toggled state as the source of truth.
// score = matched / (matched + missing) * 100 — no fuzzy matching needed.
export function scoreSkillsFromState(matched, missing) {
  const total = matched.length + missing.length;
  if (total === 0) return null;
  return Math.round((matched.length / total) * 100);
}

export function scoreSalary(salaryMin, salaryMax) {
  if ((salaryMin === null || salaryMin === undefined) && (salaryMax === null || salaryMax === undefined)) return null;
  const salary =
    salaryMin != null && salaryMax != null
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

export function scoreLocation(location, isRemote) {
  if (isRemote) return 100;
  if (!location) return null;
  const n = location.toLowerCase();
  if (n.includes('remote')) return 100;
  if (SF_BAY_AREA.some(t => n.includes(t))) return 100;
  if (TIER_2.some(t => n.includes(t))) return 60;
  return 20;
}

export function scoreRecency(datePosted) {
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

export function scoreCompetitiveness(count) {
  if (count === null || count === undefined) return null;
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

export function computeOverall(scores) {
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
