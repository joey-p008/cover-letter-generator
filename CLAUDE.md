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

This is a split client/server app with no shared code between the two halves.

**Request flow:**
1. User uploads a resume file + pastes a job posting in the React UI
2. Frontend POSTs `multipart/form-data` to `/api/generate` (proxied by Vite to `localhost:3001`)
3. Server parses the resume file into plain text (`parseResume.js`)
4. Server sends resume text + job posting to Claude via the Anthropic SDK (`generateLetter.js`)
5. Claude returns the letter as plain text following a strict template
6. Server converts the plain text into a formatted `.docx` buffer (`createDocx.js`)
7. Server responds with the `.docx` as an attachment; the letter text is also base64-encoded into the `X-Letter-Text` response header for the in-browser preview
8. Frontend decodes the header for the preview pane and triggers a blob download for the file

**Environment:** `ANTHROPIC_API_KEY` lives in `.env` at the project root. The server loads it with `dotenv` pointing one directory up from `server/`.

## Server (`server/` — CommonJS, Express 5)

- `index.js` — bootstraps Express, loads env, mounts the single route
- `routes/generate.js` — the only route (`POST /api/generate`). Accepts `resume` file + `linkedinCsv` file (stubbed, not processed) + `jobPosting` text field via `multer` memory storage
- `utils/parseResume.js` — dispatches to `pdf-parse` or `mammoth` based on mimetype
- `utils/generateLetter.js` — holds the full system prompt and calls `claude-sonnet-4-6` with `max_tokens: 1024`
- `utils/createDocx.js` — parses the letter's line structure positionally (line 1 = name at 16pt bold, line 2 = contact at 10pt, remainder at 11pt) and builds a `docx` Document with 1-inch margins, 1.15 line spacing, 6pt paragraph spacing

## Client (`client/` — ESM, React 18, Vite 5)

- `App.jsx` — owns all state (files, job posting text, loading, error, result). Switches between the form view and the preview view based on whether `result` is set
- `components/FileUpload.jsx` — drag-and-drop zones for resume and LinkedIn CSV
- `components/JobPostingInput.jsx` — textarea for the job description
- `components/CoverLetterPreview.jsx` — renders letter text line-by-line and triggers blob download

All styling is in `App.css` (component styles) and `index.css` (CSS custom properties / reset).

## LinkedIn CSV

The file upload input exists in the UI and the field is accepted by the server via multer, but nothing is done with it. The integration point is marked with a `TODO` comment in `server/routes/generate.js`.

## Docx formatting constants

Sizes in `createDocx.js` use Word's native units:
- Font sizes are in half-points (22 = 11pt, 32 = 16pt, 20 = 10pt)
- Spacing is in twips (1440 = 1 inch, 276 = 1.15× line height, 120 = 6pt)

After creating the cover letter, run the /Humanizer skill to ensure that the text appears human-written, with no signs of AI generation.