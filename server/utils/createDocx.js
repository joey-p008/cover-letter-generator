const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');

const TWIPS_PER_INCH = 1440;
const LINE_SPACING_115 = 276; // 1.15 * 240 twips
const SPACING_6PT = 120; // 6pt in twips

function makeParagraph(text, { fontSize = 22, bold = false, spacingAfter = SPACING_6PT } = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: LINE_SPACING_115, after: spacingAfter },
    children: [
      new TextRun({
        text,
        font: 'Calibri',
        size: fontSize, // half-points
        bold,
      }),
    ],
  });
}

function makeBlank() {
  return new Paragraph({
    spacing: { line: LINE_SPACING_115, after: 0 },
    children: [new TextRun({ text: '', font: 'Calibri', size: 22 })],
  });
}

function buildDocx(letterText) {
  const lines = letterText.split('\n');

  const paragraphs = [];
  let lineIndex = 0;

  // Line 1: Full name (16pt bold)
  const nameLine = lines[lineIndex]?.trim() || '[Your Name]';
  paragraphs.push(makeParagraph(nameLine, { fontSize: 32, bold: true, spacingAfter: 0 }));
  lineIndex++;

  // Line 2: Contact info (10pt)
  while (lineIndex < lines.length && lines[lineIndex].trim() === '') lineIndex++;
  const contactLine = lines[lineIndex]?.trim() || '[Email] | [Phone] | [City, State]';
  paragraphs.push(makeParagraph(contactLine, { fontSize: 20, spacingAfter: SPACING_6PT }));
  lineIndex++;

  // Blank separator
  paragraphs.push(makeBlank());

  // Skip blank lines then read remaining content as body paragraphs
  while (lineIndex < lines.length && lines[lineIndex].trim() === '') lineIndex++;

  // Everything from here is body text (date, recipient, salutation, body, closing)
  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    const trimmed = line.trim();

    if (trimmed === '') {
      paragraphs.push(makeBlank());
    } else {
      paragraphs.push(makeParagraph(trimmed));
    }

    lineIndex++;
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: TWIPS_PER_INCH,
              right: TWIPS_PER_INCH,
              bottom: TWIPS_PER_INCH,
              left: TWIPS_PER_INCH,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return doc;
}

async function createDocxBuffer(letterText) {
  const doc = buildDocx(letterText);
  return Packer.toBuffer(doc);
}

function extractDocxFilename(letterText, fallbackLastName = 'Applicant') {
  const lines = letterText.split('\n').map(l => l.trim()).filter(Boolean);

  // First line = full name
  const fullName = lines[0] || '';
  const lastName = fullName.split(' ').pop() || fallbackLastName;

  // Find company name: look for line after "Hiring Team" or the line right after the date block
  // The structure is: name, contact, blank, date, blank, recipient name OR "Hiring Team", company name
  let companyName = 'Company';
  for (let i = 0; i < lines.length; i++) {
    if (/^dear\b/i.test(lines[i])) {
      // Company should be 1-2 lines before "Dear"
      const candidate = lines[i - 1]?.trim();
      if (candidate && !/hiring team/i.test(candidate) && !/hiring manager/i.test(candidate)) {
        companyName = candidate;
      } else if (lines[i - 2]?.trim()) {
        companyName = lines[i - 2].trim();
      }
      break;
    }
  }

  return `Cover Letter ${companyName} ${lastName}.docx`;
}

module.exports = { createDocxBuffer, extractDocxFilename };
