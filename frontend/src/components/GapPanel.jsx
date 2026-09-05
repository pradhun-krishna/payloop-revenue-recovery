import React from 'react';
import { formatINRFromRupees } from '../lib/utils';

export default function GapPanel({ gaps }) {
  if (!gaps) return null;

  const sortedGaps = [...gaps].sort((a, b) => {
    // Demo simulations ALWAYS pinned to Card #1 at the top!
    if (a.is_demo_simulation && !b.is_demo_simulation) return -1;
    if (!a.is_demo_simulation && b.is_demo_simulation) return 1;
    const sevMap = { high: 3, medium: 2, low: 1 };
    return sevMap[b.severity] - sevMap[a.severity];
  });

  return (
    <div className="bg-bg-surface border border-border rounded-card h-full flex flex-col">
      <div className="px-16 py-12 border-b border-border flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-text-primary">Detected Gaps</h3>
        <span className="text-[11px] bg-bg-elevated px-[8px] py-[2px] rounded-tag text-text-secondary">
          {gaps.length} issues
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-12 space-y-12" style={{ maxHeight: '600px' }}>
        {sortedGaps.map((gap) => (
          <GapCard key={gap.gap_id} gap={gap} />
        ))}
      </div>
    </div>
  );
}

function GapCard({ gap }) {
  const getBorderColor = (sev) => {
    switch(sev) {
      case 'high': return 'border-danger/40';
      case 'medium': return 'border-warning/40';
      default: return 'border-border';
    }
  };

  const getDotColor = (sev) => {
    switch(sev) {
      case 'high': return 'bg-danger';
      case 'medium': return 'bg-warning';
      default: return 'bg-text-tertiary';
    }
  };

  return (
    <div className={`border ${gap.is_demo_simulation ? 'border-accent bg-accent/10 shadow-[inset_0_0_12px_rgba(var(--color-accent),0.2)]' : `bg-bg-elevated ${getBorderColor(gap.severity)}`} rounded p-12 relative`}>
      {gap.is_demo_simulation && (
        <span className="absolute top-12 right-12 text-[10px] text-accent bg-accent/20 px-[6px] py-[2px] rounded-tag">SIMULATED</span>
      )}
      <div className="flex items-start justify-between mb-[8px]">
        <div className="flex items-center gap-[6px]">
          <span className={`w-[6px] h-[6px] rounded-full ${getDotColor(gap.severity)}`} />
          <span className="text-[11px] font-medium tracking-label text-text-secondary">
            {gap.type.replace(/_/g, ' ')}
          </span>
        </div>
        <span className="text-[12px] font-mono text-text-primary">
          {gap.amount_inr > 0 ? formatINRFromRupees(gap.amount_inr) : '—'}
        </span>
      </div>

      <p className="text-[13px] text-text-primary leading-relaxed mb-[8px]">
        {gap.plain_english}
      </p>

      <div className="text-[11px] text-accent/80 bg-accent/10 px-[8px] py-[4px] rounded border border-accent/20">
        <span className="font-medium">Action: </span>
        {gap.suggested_action}
      </div>
    </div>
  );
}
