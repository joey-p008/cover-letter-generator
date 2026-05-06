import { useState, useMemo } from 'react';
import {
  scoreExperience,
  scoreSkillsFromState,
  scoreSalary,
  scoreLocation,
  scoreRecency,
  scoreCompetitiveness,
  computeOverall,
} from '../utils/scoreJobMatch';

function scoreClass(score) {
  if (score === null || score === undefined) return '';
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
  const [editableJobData, setEditableJobData] = useState(null);
  const [editableSkills, setEditableSkills] = useState(null);
  const [newSkillInput, setNewSkillInput] = useState('');

  // Initialize editable state from result (only once per result object)
  const jobData = editableJobData ?? result?.jobData ?? {};
  const skills = editableSkills ?? {
    matched: result?.skillsBreakdown?.matched ?? [],
    missing: result?.skillsBreakdown?.missing ?? [],
    bonusMatched: result?.skillsBreakdown?.bonusMatched ?? [],
    bonusMissing: result?.skillsBreakdown?.bonusMissing ?? [],
  };

  const liveScores = useMemo(() => {
    if (!result) return {};
    return {
      experience: scoreExperience(result.candidateData?.experienceLevel, jobData.experienceLevel),
      skills: scoreSkillsFromState(skills.matched, skills.missing),
      salary: scoreSalary(jobData.salaryMin, jobData.salaryMax),
      location: scoreLocation(jobData.location, jobData.isRemote),
      recency: scoreRecency(jobData.datePosted),
      competitiveness: scoreCompetitiveness(jobData.applicantCount),
    };
  }, [jobData, skills, result]);

  const liveOverall = useMemo(() => computeOverall(liveScores), [liveScores]);

  if (status === 'loading') return <Spinner />;
  if (status === 'error') return <div className="error-msg" style={{ margin: '24px' }}>{error}</div>;
  if (!result) return null;

  function updateJobData(key, value) {
    setEditableJobData(prev => ({ ...(prev ?? result.jobData), [key]: value }));
  }

  function toggleSkill(skill, fromGroup) {
    setEditableSkills(prev => {
      const s = prev ?? { ...skills };
      if (fromGroup === 'matched') {
        return { ...s, matched: s.matched.filter(x => x !== skill), missing: [...s.missing, skill] };
      }
      return { ...s, missing: s.missing.filter(x => x !== skill), matched: [...s.matched, skill] };
    });
  }

  function toggleBonusSkill(skill, fromGroup) {
    setEditableSkills(prev => {
      const s = prev ?? { ...skills };
      if (fromGroup === 'bonusMatched') {
        return { ...s, bonusMatched: s.bonusMatched.filter(x => x !== skill), bonusMissing: [...s.bonusMissing, skill] };
      }
      return { ...s, bonusMissing: s.bonusMissing.filter(x => x !== skill), bonusMatched: [...s.bonusMatched, skill] };
    });
  }

  function removeSkill(skill, group) {
    setEditableSkills(prev => {
      const s = prev ?? { ...skills };
      return { ...s, [group]: s[group].filter(x => x !== skill) };
    });
  }

  function addSkill() {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    setEditableSkills(prev => {
      const s = prev ?? { ...skills };
      return { ...s, matched: [...s.matched, trimmed] };
    });
    setNewSkillInput('');
  }

  const cls = scoreClass(liveOverall);
  const verdict = liveOverall >= 70 ? 'Strong fit' : liveOverall >= 40 ? 'Potential fit' : 'Weak fit';
  const isEdited = editableJobData !== null || editableSkills !== null;

  return (
    <div className="match-panel">
      {/* Score circle */}
      <div className="score-circle-wrapper">
        <div className={`score-circle ${cls}`}>
          <span className="score-number">{liveOverall ?? '?'}</span>
          <span className="score-label">/ 100</span>
        </div>
        <div className="score-verdict-row">
          <p className="score-verdict">{verdict}</p>
          {isEdited && <span className="edited-score-badge">Edited</span>}
        </div>
      </div>

      <div className="match-breakdown">
        {/* Breakdown table — scores update live */}
        <table className="breakdown-table">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Score</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
              const score = liveScores[key];
              const available = score !== null && score !== undefined;
              return (
                <tr key={key}>
                  <td>{label}</td>
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
              );
            })}
          </tbody>
        </table>

        {/* Editable job details */}
        <div className="job-data-summary">
          <p className="job-data-title">Job details</p>
          <div className="job-edit-grid">

            <div className="job-edit-field">
              <label className="job-edit-label">Experience level</label>
              <select
                className="edit-select"
                value={jobData.experienceLevel || ''}
                onChange={e => updateJobData('experienceLevel', e.target.value || null)}
              >
                <option value="">Not specified</option>
                <option value="Entry">Entry</option>
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
                <option value="Staff">Staff</option>
                <option value="Principal">Principal</option>
                <option value="Director">Director</option>
              </select>
            </div>

            <div className="job-edit-field">
              <label className="job-edit-label">Salary range ($)</label>
              <div className="edit-salary-row">
                <input
                  type="number"
                  className="edit-input"
                  placeholder="Min"
                  value={jobData.salaryMin ?? ''}
                  onChange={e => updateJobData('salaryMin', e.target.value !== '' ? Number(e.target.value) : null)}
                />
                <span className="edit-salary-sep">–</span>
                <input
                  type="number"
                  className="edit-input"
                  placeholder="Max"
                  value={jobData.salaryMax ?? ''}
                  onChange={e => updateJobData('salaryMax', e.target.value !== '' ? Number(e.target.value) : null)}
                />
              </div>
            </div>

            <div className="job-edit-field">
              <label className="job-edit-label">Location</label>
              <div className="edit-remote-row">
                <input
                  type="text"
                  className="edit-input"
                  placeholder="City, State"
                  value={jobData.location || ''}
                  onChange={e => updateJobData('location', e.target.value || null)}
                  disabled={jobData.isRemote || false}
                />
                <label className="edit-checkbox-label">
                  <input
                    type="checkbox"
                    checked={jobData.isRemote || false}
                    onChange={e => updateJobData('isRemote', e.target.checked)}
                  />
                  Remote
                </label>
              </div>
            </div>

            <div className="job-edit-field">
              <label className="job-edit-label">Date posted</label>
              <input
                type="date"
                className="edit-input"
                value={jobData.datePosted || ''}
                onChange={e => updateJobData('datePosted', e.target.value || null)}
              />
            </div>

            <div className="job-edit-field">
              <label className="job-edit-label">Applicants</label>
              <input
                type="number"
                className="edit-input"
                min="0"
                placeholder="e.g. 47"
                value={jobData.applicantCount ?? ''}
                onChange={e => updateJobData('applicantCount', e.target.value !== '' ? Number(e.target.value) : null)}
              />
            </div>

          </div>
        </div>

        {/* Skills breakdown — interactive chips */}
        <div className="skills-breakdown">
          <p className="job-data-title">Skills breakdown</p>

          {skills.matched.length > 0 && (
            <div className="skills-group">
              <p className="skills-group-label">You have ({skills.matched.length})</p>
              <div className="job-data-grid">
                {skills.matched.map(s => (
                  <span
                    key={s}
                    className="job-tag skill-matched skill-chip"
                    onClick={() => toggleSkill(s, 'matched')}
                    title="Click to mark as missing"
                  >
                    ✓ {s}
                    <button
                      className="skill-chip-remove"
                      onClick={e => { e.stopPropagation(); removeSkill(s, 'matched'); }}
                    >✕</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {skills.missing.length > 0 && (
            <div className="skills-group">
              <p className="skills-group-label">Missing ({skills.missing.length})</p>
              <div className="job-data-grid">
                {skills.missing.map(s => (
                  <span
                    key={s}
                    className="job-tag skill-missing skill-chip"
                    onClick={() => toggleSkill(s, 'missing')}
                    title="Click to mark as have"
                  >
                    ✗ {s}
                    <button
                      className="skill-chip-remove"
                      onClick={e => { e.stopPropagation(); removeSkill(s, 'missing'); }}
                    >✕</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {skills.bonusMatched.length > 0 && (
            <div className="skills-group">
              <p className="skills-group-label">Bonus — you have ({skills.bonusMatched.length})</p>
              <div className="job-data-grid">
                {skills.bonusMatched.map(s => (
                  <span
                    key={s}
                    className="job-tag skill-bonus-matched skill-chip"
                    onClick={() => toggleBonusSkill(s, 'bonusMatched')}
                    title="Click to mark as missing"
                  >
                    ✓ {s}
                    <button
                      className="skill-chip-remove"
                      onClick={e => { e.stopPropagation(); removeSkill(s, 'bonusMatched'); }}
                    >✕</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {skills.bonusMissing.length > 0 && (
            <div className="skills-group">
              <p className="skills-group-label">Bonus — missing ({skills.bonusMissing.length})</p>
              <div className="job-data-grid">
                {skills.bonusMissing.map(s => (
                  <span
                    key={s}
                    className="job-tag skill-bonus-missing skill-chip"
                    onClick={() => toggleBonusSkill(s, 'bonusMissing')}
                    title="Click to mark as have"
                  >
                    ◦ {s}
                    <button
                      className="skill-chip-remove"
                      onClick={e => { e.stopPropagation(); removeSkill(s, 'bonusMissing'); }}
                    >✕</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="skill-add-row">
            <input
              type="text"
              className="edit-input skill-add-input"
              placeholder="Add a skill..."
              value={newSkillInput}
              onChange={e => setNewSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSkill(); }}
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={addSkill}
              disabled={!newSkillInput.trim()}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
