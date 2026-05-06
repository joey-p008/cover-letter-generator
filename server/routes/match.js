const express = require('express');
const multer = require('multer');
const { parseResume } = require('../utils/parseResume');
const { scoreJobMatch } = require('../utils/scoreJobMatch');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.fields([{ name: 'resume', maxCount: 1 }]), async (req, res) => {
  try {
    const resumeFile = req.files?.resume?.[0];
    const jobPosting = req.body?.jobPosting?.trim();

    if (!resumeFile) return res.status(400).json({ error: 'Resume file is required.' });
    if (!jobPosting) return res.status(400).json({ error: 'Job posting text is required.' });

    const resumeText = await parseResume(resumeFile.buffer, resumeFile.mimetype);
    const result = await scoreJobMatch(resumeText, jobPosting);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Something went wrong.' });
  }
});

module.exports = router;
