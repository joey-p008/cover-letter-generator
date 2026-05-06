export default function JobPostingInput({ mode, onModeChange, value, onChange, urlValue, onUrlChange }) {
  return (
    <div className="field">
      <div className="field-label-row">
        <label className="field-label">
          Job Posting <span className="required">*</span>
        </label>
        <div className="input-mode-toggle">
          <button
            type="button"
            className={`mode-btn${mode === 'text' ? ' mode-active' : ''}`}
            onClick={() => onModeChange('text')}
          >
            Paste text
          </button>
          <button
            type="button"
            className={`mode-btn${mode === 'url' ? ' mode-active' : ''}`}
            onClick={() => onModeChange('url')}
          >
            From URL
          </button>
        </div>
      </div>

      {mode === 'text' ? (
        <textarea
          className="job-textarea"
          placeholder="Paste the full job description here..."
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={10}
        />
      ) : (
        <input
          type="url"
          className="job-url-input"
          placeholder="https://www.linkedin.com/jobs/view/..."
          value={urlValue}
          onChange={e => onUrlChange(e.target.value)}
        />
      )}
    </div>
  );
}
