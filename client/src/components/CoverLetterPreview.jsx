import { useState } from 'react';

function Spinner() {
  return (
    <div className="spinner-wrapper">
      <div className="spinner" />
    </div>
  );
}

function LetterBody({ letterText, cursor }) {
  const lines = (letterText || '').split('\n');
  return (
    <div className="letter-preview">
      {lines.map((line, i) =>
        line.trim() === '' ? (
          <br key={i} />
        ) : (
          <p key={i} className="letter-line">
            {line}
            {cursor && i === lines.length - 1 && <span className="typing-cursor" />}
          </p>
        )
      )}
    </div>
  );
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CoverLetterPreview({ status, letterText, docxBlob, filename, error }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const hasEdits = editedText !== null;
  const displayText = hasEdits ? editedText : letterText;

  function handleEdit() {
    setEditedText(letterText);
    setIsEditing(true);
  }

  function handleDone() {
    setIsEditing(false);
  }

  function handleCancel() {
    setEditedText(null);
    setIsEditing(false);
  }

  async function handleDownload() {
    if (hasEdits) {
      setIsDownloading(true);
      try {
        const res = await fetch('/api/generate/docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ letterText: editedText }),
        });
        if (!res.ok) throw new Error('Failed to generate document.');
        const blob = await res.blob();
        const cd = res.headers.get('Content-Disposition') || '';
        const match = cd.match(/filename="([^"]+)"/);
        triggerDownload(blob, match ? match[1] : filename || 'cover-letter.docx');
      } catch (err) {
        console.error(err);
      } finally {
        setIsDownloading(false);
      }
    } else {
      triggerDownload(docxBlob, filename);
    }
  }

  if (status === 'loading') return <Spinner />;

  if (status === 'error') {
    return <div className="error-msg" style={{ margin: '24px' }}>{error}</div>;
  }

  if (status === 'streaming') {
    return (
      <div>
        <div className="preview-actions-bar">
          <button className="btn btn-primary" disabled>Generating…</button>
        </div>
        <LetterBody letterText={letterText} cursor />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div>
        <div className="preview-actions-bar">
          <div className="preview-actions">
            <button className="btn btn-primary" onClick={handleDone}>Done editing</button>
            <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
          </div>
        </div>
        <textarea
          className="letter-edit-textarea"
          value={editedText}
          onChange={e => setEditedText(e.target.value)}
          spellCheck
        />
      </div>
    );
  }

  return (
    <div>
      <div className="preview-actions-bar">
        <div className="preview-actions">
          <button className="btn btn-primary" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? 'Generating…' : 'Download .docx'}
          </button>
          <button className="btn btn-secondary" onClick={handleEdit}>Edit</button>
        </div>
        {hasEdits && <span className="edited-badge">Edited</span>}
      </div>
      <LetterBody letterText={displayText} />
    </div>
  );
}
