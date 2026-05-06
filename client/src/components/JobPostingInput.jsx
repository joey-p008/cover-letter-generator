export default function JobPostingInput({ value, onChange }) {
  return (
    <div className="field">
      <label className="field-label">
        Job Posting <span className="required">*</span>
      </label>
      <textarea
        className="job-textarea"
        placeholder="Paste the full job description here..."
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={10}
      />
    </div>
  );
}
