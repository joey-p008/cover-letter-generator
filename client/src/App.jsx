import { useState } from 'react';
import FileUpload from './components/FileUpload';
import JobPostingInput from './components/JobPostingInput';
import CoverLetterPreview from './components/CoverLetterPreview';
import './App.css';

export default function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [linkedinFile, setLinkedinFile] = useState(null);
  const [jobPosting, setJobPosting] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { letterText, docxBlob, filename }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!resumeFile) return setError('Please upload your resume.');
    if (!jobPosting.trim()) return setError('Please paste the job posting.');

    setLoading(true);

    try {
      const form = new FormData();
      form.append('resume', resumeFile);
      if (linkedinFile) form.append('linkedinCsv', linkedinFile);
      form.append('jobPosting', jobPosting);

      const res = await fetch('/api/generate', { method: 'POST', body: form });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed.' }));
        throw new Error(body.error || 'Request failed.');
      }

      const contentDisposition = res.headers.get('Content-Disposition') || '';
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'cover-letter.docx';

      const letterTextEncoded = res.headers.get('X-Letter-Text');
      const letterText = letterTextEncoded
        ? atob(letterTextEncoded)
        : '(Preview unavailable — download to view)';

      const docxBlob = await res.blob();
      setResult({ letterText, docxBlob, filename });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setResumeFile(null);
    setLinkedinFile(null);
    setJobPosting('');
    setError('');
  }

  if (result) {
    return (
      <div className="page">
        <header className="app-header">
          <h1 className="app-title">Cover Letter Generator</h1>
        </header>
        <main className="main">
          <CoverLetterPreview
            letterText={result.letterText}
            docxBlob={result.docxBlob}
            filename={result.filename}
            onReset={handleReset}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="app-header">
        <h1 className="app-title">Cover Letter Generator</h1>
        <p className="app-subtitle">
          Upload your resume, paste a job posting, and get a tailored cover letter in seconds.
        </p>
      </header>
      <main className="main">
        <form className="form-card" onSubmit={handleSubmit}>
          <FileUpload
            resumeFile={resumeFile}
            setResumeFile={setResumeFile}
            linkedinFile={linkedinFile}
            setLinkedinFile={setLinkedinFile}
          />
          <JobPostingInput value={jobPosting} onChange={setJobPosting} />
          {error && <div className="error-msg">{error}</div>}
          <button className="btn btn-primary btn-submit" type="submit" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Cover Letter'}
          </button>
          {loading && (
            <p className="loading-note">
              Claude is writing your letter. This usually takes 10 to 20 seconds.
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
