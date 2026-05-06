const TABS = [
  { id: 'letter', label: 'Cover Letter' },
  { id: 'connections', label: 'Connections' },
  { id: 'match', label: 'Job Match' },
];

export default function ResultTabs({ activeTab, onTabChange }) {
  return (
    <div className="tab-bar">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn${activeTab === tab.id ? ' tab-active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
