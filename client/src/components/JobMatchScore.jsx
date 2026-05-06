function scoreClass(score) {
  if (score === null) return '';
  if (score >= 70) return 'score-high';
  if (score >= 40) return 'score-medium';
  return 'score-low';
}

function Spinner() {
  return (
    <div className="spinner-wrapper">
      <div className="spinner" />
    </div>
  );
}

const DIMENSION_LABELS = {
  experience: 'Experience level',
  skills: 'Skills match',
  salary: 'Salary range',
  location: 'Location',
  recency: 'Posting recency',
  competitiveness: 'Applicant pool',
};

const WEIGHT_LABELS = {
  experience: '25%',
  skills: '30%',
  salary: '20%',
  location: '15%',
  recency: '5%',
  competitiveness: '5%',
};

export default function JobMatchScore({ status, result, error }) {
  if (status === 'loading') return <Spinner />;

  if (status === 'error') {
    return <div className="error-msg" style={{ margin: '24px' }}>{error}</div>;
  }

  if (!result) return null;

  const { overall, breakdown } = result;
  const cls = scoreClass(overall);
  const label = overall >= 70 ? 'Strong fit' : overall >= 40 ? 'Potential fit' : 'Weak fit';

  return (
    <div className="match-panel">
      <div className="score-circle-wrapper">
        <div className={`score-circle ${cls}`}>
          <span className="score-number">{overall ?? '?'}</span>
          <span className="score-label">/ 100</span>
        </div>
        <p className="score-verdict">{label}</p>
      </div>

      <div className="match-breakdown">
        <table className="breakdown-table">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Score</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(breakdown).map(([key, { score, available }]) => (
              <tr key={key}>
                <td>{DIMENSION_LABELS[key]}</td>
                <td>
                  {!available ? (
                    <span className="score-na">N/A</span>
                  ) : (
                    <div className="score-bar-cell">
                      <div className="score-bar-track">
                        <div
                          className={`score-bar-fill ${scoreClass(score)}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span style={{ minWidth: 30, textAlign: 'right', fontSize: '0.8rem', fontWeight: 600 }}>
                        {score}
                      </span>
                    </div>
                  )}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{WEIGHT_LABELS[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {result.jobData && (
          <div className="job-data-summary">
            <p className="job-data-title">Extracted job details</p>
            <div className="job-data-grid">
              {result.jobData.experienceLevel && <span className="job-tag">{result.jobData.experienceLevel}-level</span>}
              {result.jobData.location && <span className="job-tag">{result.jobData.isRemote ? 'Remote' : result.jobData.location}</span>}
              {(result.jobData.salaryMin || result.jobData.salaryMax) && (
                <span className="job-tag">
                  {result.jobData.salaryMin && result.jobData.salaryMax
                    ? `$${(result.jobData.salaryMin / 1000).toFixed(0)}K–$${(result.jobData.salaryMax / 1000).toFixed(0)}K`
                    : result.jobData.salaryMin
                    ? `From $${(result.jobData.salaryMin / 1000).toFixed(0)}K`
                    : `Up to $${(result.jobData.salaryMax / 1000).toFixed(0)}K`}
                </span>
              )}
              {result.jobData.datePosted && <span className="job-tag">Posted {result.jobData.datePosted}</span>}
              {result.jobData.applicantCount !== null && <span className="job-tag">{result.jobData.applicantCount} applicants</span>}
              {result.jobData.requiredSkills?.length > 0 && (
                <span className="job-tag">{result.jobData.requiredSkills.length} required skills</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
