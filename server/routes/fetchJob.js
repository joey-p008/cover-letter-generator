const express = require('express');

const router = express.Router();

router.post('/', async (req, res) => {
  const { url } = req.body;
  if (!url?.trim()) {
    return res.status(400).json({ error: 'url is required.' });
  }

  try {
    const jinaUrl = `https://r.jina.ai/${url.trim()}`;
    const response = await fetch(jinaUrl, {
      headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`Could not load that URL (HTTP ${response.status}). Make sure the job posting is publicly accessible.`);
    }

    const jobText = await response.text();
    if (!jobText.trim()) {
      throw new Error('The URL returned empty content. Try pasting the job description text instead.');
    }

    res.json({ jobText });
  } catch (err) {
    console.error(err);
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ error: 'The page took too long to load. Try pasting the job description text instead.' });
    }
    res.status(500).json({ error: err.message || 'Failed to fetch job posting.' });
  }
});

module.exports = router;
