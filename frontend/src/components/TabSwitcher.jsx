import React from 'react';

export default function TabSwitcher({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'triage', label: 'Failure Triage' },
    { id: 'guardian', label: 'Webhook Guardian' },
    { id: 'reconciler', label: 'Settlement Reconciler' },
  ];

  return (
    <div className="flex items-center gap-[4px] px-24 py-[8px] bg-bg-surface border-b border-border/40">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-16 py-[6px] rounded-tag text-[13px] font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-bg-elevated text-text-primary border border-border shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
