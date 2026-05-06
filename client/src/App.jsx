import { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import JobPostingInput from './components/JobPostingInput';
import CoverLetterPreview from './components/CoverLetterPreview';
import ConnectionsList from './components/ConnectionsList';
import JobMatchScore from './components/JobMatchScore';
import ResultTabs from './components/ResultTabs';
import { saveFile, loadFile, clearFile } from './utils/fileStorage';
import './App.css';

export default function App() {
  // Shared inputs
  const [resumeFile, setResumeFile] = useState(null);
  const [linkedinFile, setLinkedinFile] = useState(null);
  const [jobPosting, setJobPosting] = useState('');
  const [jobPostingMode, setJobPostingMode] = useState('text');
  const [jobPostingUrl, setJobPostingUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Results view
  const [isResultsView, setIsResultsView] = useState(false);
  const [activeTab, setActiveTab] = useState('letter');
  const [letterResult, setLetterResult] = useState(null);
  const [connectionsResult, setConnectionsResult] = useState(null);
  const [matchResult, setMatchResult] = useState(null);

  // Load persisted files on mount
  useEffect(() => {
    Promise.all([
      loadFile('resume').catch(() => null),
      loadFile('linkedin').catch(() => null),
    ]).then(([resume, linkedin]) => {
      if (resume) setResumeFile(resume);
      if (linkedin) setLinkedinFile(linkedin);
    });
  }, []);

  // ── File handlers (persist to IndexedDB) ──────────────────────────────────

  function handleResumeFile(file) {
    setResumeFile(file);
    if (file) saveFile('resume', file).catch(console.error);
  }

  function handleLinkedinFile(file) {
    setLinkedinFile(file);
    if (file) saveFile('linkedin', file).catch(console.error);
  }

  function handleClearResume() {
    setResumeFile(null);
    clearFile('resume').catch(console.error);
  }

  function handleClearLinkedin() {
    setLinkedinFile(null);
    clearFile('linkedin').catch(console.error);
  }

  // ── Individual fetch helpers ───────────────────────────────────────────────

  async function fetchLetter(form) {
    try {
      const res = await fetch('/api/generate', { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed.' }));
        throw new Error(body.error || 'Request failed.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let letterText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop();

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          let data;
          try { data = JSON.parse(part.slice(6)); } catch { continue; }

          if (data.type === 'chunk') {
            letterText += data.text;
            setLetterResult({ status: 'streaming', letterText });
          } else if (data.type === 'done') {
            const bytes = Uint8Array.from(atob(data.docxBase64), c => c.charCodeAt(0));
            const docxBlob = new Blob([bytes], {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
            setLetterResult({ status: 'success', letterText, docxBlob, filename: data.filename });
          } else if (data.type === 'error') {
            throw new Error(data.error);
          }
        }
      }
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

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!resumeFile) return setFormError('Please upload your resume.');

    let resolvedJobPosting = '';

    if (jobPostingMode === 'url') {
      if (!jobPostingUrl.trim()) return setFormError('Please enter a job posting URL.');
      setIsSubmitting(true);
      try {
        const res = await fetch('/api/fetch-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: jobPostingUrl.trim() }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setFormError(body.error || 'Failed to fetch the job posting. Try pasting the text instead.');
          setIsSubmitting(false);
          return;
        }
        const { jobText } = await res.json();
        resolvedJobPosting = jobText;
      } catch {
        setFormError('Failed to fetch the job posting. Check the URL and try again.');
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
    } else {
      if (!jobPosting.trim()) return setFormError('Please paste the job posting.');
      resolvedJobPosting = jobPosting;
    }

    const form = new FormData();
    form.append('resume', resumeFile);
    if (linkedinFile) form.append('linkedinCsv', linkedinFile);
    form.append('jobPosting', resolvedJobPosting);

    setIsResultsView(true);
    setActiveTab('letter');
    setLetterResult({ status: 'loading' });
    setConnectionsResult(linkedinFile ? { status: 'loading' } : { status: 'no-csv' });
    setMatchResult({ status: 'loading' });

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
    // Resume and LinkedIn files are intentionally kept — persists across sessions
    setJobPosting('');
    setJobPostingUrl('');
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
            onResumeFile={handleResumeFile}
            onClearResume={handleClearResume}
            linkedinFile={linkedinFile}
            onLinkedinFile={handleLinkedinFile}
            onClearLinkedin={handleClearLinkedin}
          />
          <JobPostingInput
            mode={jobPostingMode}
            onModeChange={setJobPostingMode}
            value={jobPosting}
            onChange={setJobPosting}
            urlValue={jobPostingUrl}
            onUrlChange={setJobPostingUrl}
          />
          {formError && <div className="error-msg">{formError}</div>}
          <button
            className="btn btn-primary btn-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Fetching job posting…' : 'Generate'}
          </button>
        </form>
      </main>
    </div>
  );
}
