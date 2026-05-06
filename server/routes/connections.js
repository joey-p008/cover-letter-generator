const express = require('express');
const multer = require('multer');
const { scoreConnections } = require('../utils/scoreConnections');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.fields([{ name: 'linkedinCsv', maxCount: 1 }]), async (req, res) => {
  try {
    const csvFile = req.files?.linkedinCsv?.[0];
    const jobPosting = req.body?.jobPosting?.trim();

    if (!csvFile) return res.status(400).json({ error: 'LinkedIn CSV file is required.' });
    if (!jobPosting) return res.status(400).json({ error: 'Job posting text is required.' });

    const csvText = csvFile.buffer.toString('utf-8');
    const connections = await scoreConnections(csvText, jobPosting);

    res.json({ connections });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Something went wrong.' });
  }
});

module.exports = router;
