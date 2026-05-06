import { useState } from 'react';
import FileUpload from './components/FileUpload';
import JobPostingInput from './components/JobPostingInput';
import CoverLetterPreview from './components/CoverLetterPreview';
import ConnectionsList from './components/ConnectionsList';
import JobMatchScore from './components/JobMatchScore';
import ResultTabs from './components/ResultTabs';
import './App.css';

export default function App() {
  // Shared inputs
  const [resumeFile, setResumeFile] = useState(null);
  const [linkedinFile, setLinkedinFile] = useState(null);
  const [jobPosting, setJobPosting] = useState('');
  const [formError, setFormError] = useState('');

  // Results view
  const [isResultsView, setIsResultsView] = useState(false);
  const [activeTab, setActiveTab] = useState('letter');
  const [letterResult, setLetterResult] = useState(null);
  const [connectionsResult, setConnectionsResult] = useState(null);
  const [matchResult, setMatchResult] = useState(null);

  // ── Individual fetch helpers ───────────────────────────────────────────────

  async function fetchLetter(form) {
    try {
      const res = await fetch('/api/generate', { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed.' }));
        throw new Error(body.error || 'Request failed.');
      }
      const contentDisposition = res.headers.get('Content-Disposition') || '';
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'cover-letter.docx';
      const encoded = res.headers.get('X-Letter-Text');
      const letterText = encoded ? atob(encoded) : '(Preview unavailable — download to view)';
      const docxBlob = await res.blob();
      setLetterResult({ status: 'success', letterText, docxBlob, filename });
    } catch (err) {
      setLetterResult({ status: 'error', error: err.message });
    }
  }

  async function fetchConnections(form) {
    try {
      const res = await fetch('/api/connections', { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed.' }));
        throw new Error(body.error || 'Request failed.');
      }
      const { connections } = await res.json();
      setConnectionsResult({ status: 'success', connections });
    } catch (err) {
      setConnectionsResult({ status: 'error', error: err.message });
    }
  }

  async function fetchMatch(form) {
    try {
      const res = await fetch('/api/match', { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed.' }));
        throw new Error(body.error || 'Request failed.');
      }
      const result = await res.json();
      setMatchResult({ status: 'success', result });
    } catch (err) {
      setMatchResult({ status: 'error', error: err.message });
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!resumeFile) return setFormError('Please upload your resume.');
    if (!jobPosting.trim()) return setFormError('Please paste the job posting.');

    // Build a single FormData shared across all three requests
    const form = new FormData();
    form.append('resume', resumeFile);
    if (linkedinFile) form.append('linkedinCsv', linkedinFile);
    form.append('jobPosting', jobPosting);

    // Switch to results view immediately
    setIsResultsView(true);
    setActiveTab('letter');
    setLetterResult({ status: 'loading' });
    setConnectionsResult(linkedinFile ? { status: 'loading' } : { status: 'no-csv' });
    setMatchResult({ status: 'loading' });

    // Fire all three in parallel — each updates its own state slice
    fetchLetter(form);
    if (linkedinFile) fetchConnections(form);
    fetchMatch(form);
  }

  function handleReset() {
    setIsResultsView(false);
    setActiveTab('letter');
    setLetterResult(null);
    setConnectionsResult(null);
    setMatchResult(null);
    setResumeFile(null);
    setLinkedinFile(null);
    setJobPosting('');
    setFormError('');
  }

  // ── Results view ───────────────────────────────────────────────────────────

  if (isResultsView) {
    return (
      <div className="page">
        <header className="app-header">
          <h1 className="app-title">Cover Letter Generator</h1>
        </header>
        <main className="main">
          <div className="results-card">
            <div className="results-header">
              <ResultTabs activeTab={activeTab} onTabChange={setActiveTab} />
              <button className="btn btn-secondary" onClick={handleReset}>
                Start Over
              </button>
            </div>

            {activeTab === 'letter' && (
              <CoverLetterPreview
                status={letterResult?.status}
                letterText={letterResult?.letterText}
                docxBlob={letterResult?.docxBlob}
                filename={letterResult?.filename}
                error={letterResult?.error}
              />
            )}
            {activeTab === 'connections' && (
              <ConnectionsList
                status={connectionsResult?.status ?? 'loading'}
                connections={connectionsResult?.connections ?? []}
                error={connectionsResult?.error}
              />
            )}
            {activeTab === 'match' && (
              <JobMatchScore
                status={matchResult?.status ?? 'loading'}
                result={matchResult?.result}
                error={matchResult?.error}
              />
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── Form view ──────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <header className="app-header">
        <h1 className="app-title">Cover Letter Generator</h1>
        <p className="app-subtitle">
          Upload your resume, paste a job posting, and get a cover letter, connection insights, and job match score.
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
          {formError && <div className="error-msg">{formError}</div>}
          <button className="btn btn-primary btn-submit" type="submit">
            Generate
          </button>
        </form>
      </main>
    </div>
  );
}
