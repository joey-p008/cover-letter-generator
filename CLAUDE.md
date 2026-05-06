# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

Two processes must run simultaneously — start each in its own terminal:

```bash
# Terminal 1: backend (port 3001)
cd server && node index.js

# Terminal 2: frontend (port 5173)
cd client && npm run dev
```

Then open http://localhost:5173.

Node.js 20.15.1 is in use. Both Vite and pdf-parse are pinned to versions compatible with this (`vite@5`, `pdf-parse@1.1.1`) — do not upgrade them without also upgrading Node.

## Architecture

Split client/server app. Three analyses run in parallel when the user clicks Generate:

1. **Cover Letter** — resume + job posting → Claude Sonnet (streamed) → editable preview → `.docx`
2. **Connections** — LinkedIn CSV + job posting → Haiku extracts company + function keywords → JS filters CSV → JS scores by function relevance (primary) + seniority (secondary)
3. **Job Match** — resume + job posting → Haiku extracts structured data → code scores 6 dimensions + skills gap

Results appear in three tabs on the results screen. Each tab is independent; one failing doesn't block the others.

**Environment:** `ANTHROPIC_API_KEY` lives in `.env` at the project root. The server loads it with `dotenv` pointing one directory up from `server/`.

## Server (`server/` — CommonJS, Express 5)

**Routes** (all accept multipart via `multer` memory storage unless noted):
- `routes/generate.js` — `POST /api/generate`: resume + jobPosting → **SSE stream** of text chunks, then a final `done` event carrying the DOCX as base64
- `routes/generateDocx.js` — `POST /api/generate/docx`: JSON `{ letterText }` → regenerates DOCX from edited text; used when the user downloads after making edits in-app
- `routes/connections.js` — `POST /api/connections`: linkedinCsv + jobPosting → `{ connections: [...] }`
- `routes/match.js` — `POST /api/match`: resume + jobPosting → `{ overall, breakdown, skillsBreakdown, jobData, candidateData }`
- `routes/fetchJob.js` — `POST /api/fetch-job`: JSON `{ url }` → proxies through `r.jina.ai` to extract clean text from any job posting URL (handles JS-rendered pages like LinkedIn); returns `{ jobText }`

**Route mount order matters:** `/api/generate/docx` is mounted before `/api/generate` in `index.js` so Express matches the more specific path first.

**Multer gotcha:** The client sends one `FormData` with both `resume` and `linkedinCsv` to all three multipart endpoints simultaneously. Every route must declare both fields in `upload.fields([...])` — if a route only declares one, multer throws `MulterError: Unexpected field` when the other arrives.

**Utilities:**
- `utils/parseResume.js` — dispatches to `pdf-parse` (PDF) or `mammoth` (DOCX) by mimetype
- `utils/generateLetter.js` — exports `streamLetter(resumeText, jobPostingText)`, an async generator that yields text chunks from `claude-sonnet-4-6` by iterating the stream and filtering `content_block_delta` events (SDK v0.95.0 does not expose `.textStream`); full system prompt with anti-fabrication + voice rules
- `utils/createDocx.js` — positional line parser (line 1 = name 16pt bold, line 2 = contact 10pt, rest 11pt); 1-inch margins, Calibri, 1.15 line spacing
- `utils/scoreConnections.js` — validates LinkedIn CSV headers using `findHeaderRowIndex()`; uses `claude-haiku-4-5-20251001` (max_tokens: 100) to extract `{ company, functionKeywords[] }` in one call, then pure JS: `companyMatches()` filters rows using strict normalized equality (strips corporate suffixes like Inc/LLC/Corp/Group/Technologies, lowercases, removes punctuation — must match exactly after normalization), score = `scoreFunctionRelevance(0–60)` + `scoreSeniority(0–40)`; function relevance is primary (2+ keyword matches in title=60, 1=45, 0=15), seniority is secondary (C-suite=40, VP=38, Director=32, Manager/Lead=26, Senior=20, other=15)
- `utils/scoreJobMatch.js` — two parallel `claude-haiku-4-5-20251001` calls (job extraction + candidate extraction), then pure JS scoring; `extractJobData` follows the JOBSCRAPER skill (`.claude/Skills/Humanizer/JOBSCRAPER.md`) — returns `requiredSkills[]`, `preferredSkills[]`, `bonusSkills[]` (hard skills only, normalized, no soft skills); `scoreSkills()` scores against required+preferred only, returns `{ score, matched[], missing[], bonusMatched[], bonusMissing[] }`; bonus skills appear in the UI but are excluded from the score; final result includes `skillsBreakdown: { matched, missing, bonusMatched, bonusMissing }`

**SSE streaming for cover letter:** `routes/generate.js` sets `Content-Type: text/event-stream` after validating inputs, then pipes chunks from `streamLetter` as `data: {"type":"chunk","text":"..."}` events. When the full text is assembled it creates the DOCX and sends a final `data: {"type":"done","docxBase64":"...","filename":"..."}` event. Validation errors before streaming starts are returned as normal JSON with a 4xx/5xx status. Errors mid-stream are sent as `data: {"type":"error","error":"..."}`.

**LinkedIn CSV format:** LinkedIn exports contain these columns: `First Name, Last Name, LinkedIn URL, Email Address, Company, Position, Connected On`. The file begins with several preamble lines before the header row; `findHeaderRowIndex()` locates the real header by scanning for a line that contains all of `first name`, `last name`, `company`, and `position`. Connection names in the UI render as clickable LinkedIn profile links when `linkedinUrl` is present.

## Client (`client/` — ESM, React 18, Vite 5)

**State in `App.jsx`:**
- `isResultsView` — switches between form and results layout
- `activeTab` — `'letter' | 'connections' | 'match'`
- `letterResult / connectionsResult / matchResult` — each has `{ status, ...data }` where status is `'loading' | 'streaming' | 'success' | 'error' | 'no-csv'`
- `jobPostingMode` — `'text' | 'url'`; when `'url'`, `handleSubmit` calls `/api/fetch-job` first to resolve the text before firing the three parallel requests
- `isSubmitting` — true while the URL fetch is in progress; disables the Generate button

**File persistence (`utils/fileStorage.js`):** IndexedDB wrapper with `saveFile(key, file)`, `loadFile(key)`, `clearFile(key)`. On mount, `App.jsx` loads `'resume'` and `'linkedin'` keys and pre-populates state. Files are saved on every drop/select and deleted when the user clicks ✕. `handleReset` does NOT clear files — they persist across sessions.

**Components:**
- `components/FileUpload.jsx` — drag-and-drop with ✕ clear buttons; calls `onResumeFile`/`onLinkedinFile`/`onClearResume`/`onClearLinkedin` props (parent handles IndexedDB)
- `components/JobPostingInput.jsx` — "Paste text" / "From URL" toggle; text mode shows textarea, URL mode shows a single-line input
- `components/ResultTabs.jsx` — tab navigation bar
- `components/CoverLetterPreview.jsx` — handles `loading`, `streaming` (live text + cursor), `success` (letter + Edit + Download buttons), and `error` states; edit mode shows a full-height textarea; downloading an edited letter POSTs to `/api/generate/docx`
- `components/ConnectionsList.jsx` — ranked connection cards with score badges; handles no-csv/empty/error states
- `components/JobMatchScore.jsx` — score circle + breakdown table + skills gap section (green ✓ matched, red ✗ missing, amber ✓ bonus-matched, gray ◦ bonus-missing)

## Job match scoring rules

All scoring in `utils/scoreJobMatch.js` — no Claude involvement after extraction:

- **Experience (25%)**: lookup table by seniority rank difference (Entry=0 → Director=6); exact match=100, ±1 level = 85/70, ±2 = 60/40, ±3+ = 15
- **Skills (30%)**: `(fuzzy-matched required + preferred skills) / (total required + preferred skills) * 100`; bonus skills are shown in UI only and excluded from the score
- **Salary (20%)**: `<$60K` → linear 0–40; `$60K–$80K` → 100; `$80K–$160K` → linear 100–20; `>$160K` → 20. Uses midpoint of range.
- **Location (15%)**: SF Bay Area + Remote = 100; CA/NYC/Seattle/Austin = 60; anywhere else = 20
- **Recency (5%)**: ≤3 days=90, ≤7=80, ≤14=60, ≤30=40, older=20
- **Competitiveness (5%)**: <10 applicants=100, ≤50=80, ≤100=60, ≤200=40, >200=20
- Missing dimensions are skipped and remaining weights re-normalized

## Docx formatting constants

Sizes in `createDocx.js` use Word's native units:
- Font sizes are in half-points (22 = 11pt, 32 = 16pt, 20 = 10pt)
- Spacing is in twips (1440 = 1 inch, 276 = 1.15× line height, 120 = 6pt)

After creating the cover letter, run the /Humanizer skill to ensure that the text appears human-written, with no signs of AI generation.
