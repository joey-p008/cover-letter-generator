import { useRef } from 'react';

function DropZone({ label, accept, file, onFile, hint }) {
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  }

  return (
    <div
      className="drop-zone"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => e.target.files[0] && onFile(e.target.files[0])}
      />
      <div className="drop-zone-icon">+</div>
      <div className="drop-zone-label">{label}</div>
      {file ? (
        <div className="drop-zone-file">{file.name}</div>
      ) : (
        <div className="drop-zone-hint">{hint}</div>
      )}
    </div>
  );
}

export default function FileUpload({ resumeFile, setResumeFile, linkedinFile, setLinkedinFile }) {
  return (
    <div className="file-upload-row">
      <div className="file-upload-col">
        <label className="field-label">Resume <span className="required">*</span></label>
        <DropZone
          label="Upload Resume"
          accept=".pdf,.doc,.docx"
          file={resumeFile}
          onFile={setResumeFile}
          hint="PDF or Word (.pdf, .docx)"
        />
      </div>
      <div className="file-upload-col">
        <label className="field-label">
          LinkedIn CSV <span className="optional">(optional, coming soon)</span>
        </label>
        <DropZone
          label="Upload Connections CSV"
          accept=".csv"
          file={linkedinFile}
          onFile={setLinkedinFile}
          hint="Export from LinkedIn > Connections"
        />
      </div>
    </div>
  );
}
