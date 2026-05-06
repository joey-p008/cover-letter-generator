const express = require('express');
const multer = require('multer');
const { parseResume } = require('../utils/parseResume');
const { streamLetter } = require('../utils/generateLetter');
const { createDocxBuffer, extractDocxFilename } = require('../utils/createDocx');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/',
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'linkedinCsv', maxCount: 1 },
  ]),
  async (req, res) => {
    const resumeFile = req.files?.resume?.[0];
    const jobPosting = req.body?.jobPosting?.trim();

    if (!resumeFile) return res.status(400).json({ error: 'Resume file is required.' });
    if (!jobPosting) return res.status(400).json({ error: 'Job posting text is required.' });

    let resumeText;
    try {
      resumeText = await parseResume(resumeFile.buffer, resumeFile.mimetype);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Failed to parse resume.' });
    }

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    function send(payload) {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }

    try {
      let fullText = '';
      for await (const chunk of streamLetter(resumeText, jobPosting)) {
        fullText += chunk;
        send({ type: 'chunk', text: chunk });
      }

      const docxBuffer = await createDocxBuffer(fullText);
      const filename = extractDocxFilename(fullText);
      send({ type: 'done', docxBase64: docxBuffer.toString('base64'), filename });
    } catch (err) {
      console.error(err);
      send({ type: 'error', error: err.message || 'Something went wrong.' });
    }

    res.end();
  }
);

module.exports = router;
