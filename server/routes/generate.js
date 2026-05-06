const express = require('express');
const multer = require('multer');
const { parseResume } = require('../utils/parseResume');
const { generateLetter } = require('../utils/generateLetter');
const { createDocxBuffer, extractDocxFilename } = require('../utils/createDocx');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/',
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'linkedinCsv', maxCount: 1 }, // accepted but not yet used
  ]),
  async (req, res) => {
    try {
      const resumeFile = req.files?.resume?.[0];
      const jobPosting = req.body?.jobPosting?.trim();

      if (!resumeFile) {
        return res.status(400).json({ error: 'Resume file is required.' });
      }
      if (!jobPosting) {
        return res.status(400).json({ error: 'Job posting text is required.' });
      }

      // TODO: LinkedIn CSV processing will go here when that feature is built
      // const linkedinFile = req.files?.linkedinCsv?.[0];

      const resumeText = await parseResume(resumeFile.buffer, resumeFile.mimetype);
      const letterText = await generateLetter(resumeText, jobPosting);
      const docxBuffer = await createDocxBuffer(letterText);
      const filename = extractDocxFilename(letterText);

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Letter-Text': Buffer.from(letterText).toString('base64'),
      });

      res.send(docxBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Something went wrong.' });
    }
  }
);

module.exports = router;
