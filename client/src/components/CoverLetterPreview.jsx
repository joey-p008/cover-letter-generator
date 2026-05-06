export default function CoverLetterPreview({ letterText, docxBlob, filename, onReset }) {
  function handleDownload() {
    const url = URL.createObjectURL(docxBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="preview-container">
      <div className="preview-header">
        <h2 className="preview-title">Your Cover Letter</h2>
        <div className="preview-actions">
          <button className="btn btn-primary" onClick={handleDownload}>
            Download .docx
          </button>
          <button className="btn btn-secondary" onClick={onReset}>
            Start Over
          </button>
        </div>
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
