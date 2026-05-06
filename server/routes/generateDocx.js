const express = require('express');
const { createDocxBuffer, extractDocxFilename } = require('../utils/createDocx');

const router = express.Router();

router.post('/', async (req, res) => {
  const { letterText } = req.body;
  if (!letterText?.trim()) {
    return res.status(400).json({ error: 'letterText is required.' });
  }

  try {
    const docxBuffer = await createDocxBuffer(letterText);
    const filename = extractDocxFilename(letterText);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(docxBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create document.' });
  }
});

module.exports = router;
