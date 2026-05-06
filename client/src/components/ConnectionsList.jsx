function scoreClass(score) {
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

function EmptyState({ icon, title, body }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-body">{body}</p>
    </div>
  );
}

export default function ConnectionsList({ status, connections, error }) {
  if (status === 'no-csv') {
    return (
      <EmptyState
        icon="📎"
        title="Upload your LinkedIn CSV"
        body="Export your connections from LinkedIn (Settings → Data Privacy → Get a copy of your data → Connections) and upload the file to find people at this company."
      />
    );
  }

  if (status === 'loading') return <Spinner />;

  if (status === 'error') {
    return <div className="error-msg" style={{ margin: '24px' }}>{error}</div>;
  }

  if (!connections || connections.length === 0) {
    return (
      <EmptyState
        icon="🔍"
        title="No connections found at this company"
        body="None of your LinkedIn connections appear to work there. Try reaching out cold, or check whether the company uses a different name on LinkedIn."
      />
    );
  }

  return (
    <div className="connections-list">
      <p className="connections-count">
        {connections.length} connection{connections.length !== 1 ? 's' : ''} found — sorted by relevance
      </p>
      {connections.map((c, i) => (
        <div key={i} className="connection-card">
          <div className="connection-info">
            <p className="connection-name">{c.firstName} {c.lastName}</p>
            <p className="connection-title">{c.title}</p>
            <p className="connection-meta">{c.company}{c.connectedOn ? ` · Connected ${c.connectedOn}` : ''}</p>
            {c.rationale && <p className="connection-rationale">{c.rationale}</p>}
          </div>
          <div className={`score-badge ${scoreClass(c.score)}`}>{c.score}</div>
        </div>
      ))}
    </div>
  );
}
