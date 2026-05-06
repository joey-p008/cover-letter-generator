function Spinner() {
  return (
    <div className="spinner-wrapper">
      <div className="spinner" />
    </div>
  );
}

function LetterBody({ letterText, cursor }) {
  return (
    <div className="letter-preview">
      {letterText.split('\n').map((line, i, arr) =>
        line.trim() === '' ? (
          <br key={i} />
        ) : (
          <p key={i} className="letter-line">
            {line}
            {cursor && i === arr.length - 1 && <span className="typing-cursor" />}
          </p>
        )
      )}
    </div>
  );
}

export default function CoverLetterPreview({ status, letterText, docxBlob, filename, error }) {
  function handleDownload() {
    const url = URL.createObjectURL(docxBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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

  return (
    <div>
      <div className="preview-actions-bar">
        <button className="btn btn-primary" onClick={handleDownload}>Download .docx</button>
      </div>
      <LetterBody letterText={letterText} />
    </div>
  );
}
