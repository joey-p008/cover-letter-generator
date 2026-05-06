function Spinner() {
  return (
    <div className="spinner-wrapper">
      <div className="spinner" />
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

  return (
    <div>
      <div className="preview-actions-bar">
        <button className="btn btn-primary" onClick={handleDownload}>
          Download .docx
        </button>
      </div>
      <div className="letter-preview">
        {letterText.split('\n').map((line, i) =>
          line.trim() === '' ? (
            <br key={i} />
          ) : (
            <p key={i} className="letter-line">
              {line}
            </p>
          )
        )}
      </div>
    </div>
  );
}
