import React, { useState } from 'react';
import { formatINRFromRupees } from '../lib/utils';

/**
 * ExceptionPanel — Lists unresolved + escalated transactions.
 * Now features AI Draft Email for quick recovery outreach.
 */
export default function ExceptionPanel({ transactions }) {
  const [draftData, setDraftData] = useState(null);
  const [isDrafting, setIsDrafting] = useState(false);

  const exceptions = transactions.filter(
    (t) =>
      t.action_result === 'escalated' ||
      t.action_result === 'failed' ||
      t.action_result === 'human_review'
  );

  const escalated = exceptions.filter((t) => t.action_result === 'escalated');
  const failed = exceptions.filter((t) => t.action_result === 'failed');
  const review = exceptions.filter((t) => t.action_result === 'human_review');

  const handleDraftEmail = async (txn) => {
    setIsDrafting(txn.transaction_id);
    try {
      const res = await fetch('http://localhost:8000/api/copilot/draft-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: txn.transaction_id })
      });
      const data = await res.json();
      setDraftData({ txn, draft: data.draft });
    } catch (err) {
      console.error(err);
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <div className="bg-bg-surface rounded-card border border-border overflow-hidden relative">
      <div className="px-16 py-12 border-b border-border flex items-center justify-between">
        <h2 className="text-text-primary text-[14px] font-medium">
          Exceptions
        </h2>
        {exceptions.length > 0 && (
          <span className="text-[11px] text-danger tabular-nums">
            {exceptions.length} items
          </span>
        )}
      </div>

      <div className="p-12" style={{ maxHeight: '350px', overflowY: 'auto' }}>
        {exceptions.length === 0 && (
          <div className="text-text-tertiary text-[13px] text-center py-16">
            No exceptions yet
          </div>
        )}

        {escalated.length > 0 && (
          <ExceptionGroup
            title="Escalated"
            items={escalated}
            dotColor="#FF4D6A"
            onDraft={handleDraftEmail}
            isDrafting={isDrafting}
          />
        )}

        {failed.length > 0 && (
          <ExceptionGroup
            title="Failed recovery"
            items={failed}
            dotColor="#F5A623"
            onDraft={handleDraftEmail}
            isDrafting={isDrafting}
          />
        )}

        {review.length > 0 && (
          <ExceptionGroup
            title="Human review queue"
            items={review}
            dotColor="#8B90A7"
            onDraft={handleDraftEmail}
            isDrafting={isDrafting}
          />
        )}
      </div>

      {draftData && (
        <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm flex items-center justify-center p-16 z-10">
          <div className="bg-bg-surface border border-border rounded-lg shadow-xl w-full flex flex-col max-h-full">
            <div className="px-16 py-12 border-b border-border flex justify-between items-center bg-accent text-white rounded-t-lg">
              <span className="text-[13px] font-medium flex items-center gap-[6px]">
                <span className="text-[10px] bg-white/20 px-[4px] py-[2px] rounded">AI</span>
                Draft Recovery Email
              </span>
              <button onClick={() => setDraftData(null)} className="text-white/80 hover:text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="p-16 overflow-y-auto flex-1">
              <div className="text-[11px] text-text-tertiary mb-[8px]">TO: {draftData.txn.customer_name || 'Customer'}</div>
              <textarea 
                className="w-full h-[180px] bg-bg-elevated border border-border rounded p-12 text-[13px] text-text-primary focus:outline-none focus:border-accent resize-none"
                defaultValue={draftData.draft}
              />
            </div>
            <div className="p-12 border-t border-border flex justify-end gap-[8px]">
              <button onClick={() => setDraftData(null)} className="px-12 py-[6px] text-[12px] text-text-secondary hover:text-text-primary">Cancel</button>
              <button onClick={() => setDraftData(null)} className="px-12 py-[6px] text-[12px] bg-accent text-white rounded hover:bg-accent/90">Send Email</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExceptionGroup({ title, items, dotColor, onDraft, isDrafting }) {
  return (
    <div className="mb-12 last:mb-0">
      <div className="flex items-center gap-[6px] mb-[6px]">
        <span
          className="w-[6px] h-[6px] rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-text-secondary text-[11px] tracking-label">
          {title} ({items.length})
        </span>
      </div>

      <div className="space-y-[4px] ml-12">
        {items.slice(0, 20).map((txn, i) => (
          <div
            key={txn.transaction_id || i}
            className="flex items-center justify-between text-[12px] py-[4px] px-[8px] rounded-indicator group"
            style={{ backgroundColor: i % 2 === 0 ? 'transparent' : '#1D2035' }}
          >
            <div className="flex-1 flex justify-between items-center pr-12">
              <span className="font-mono text-text-tertiary">
                {txn.transaction_id?.slice(0, 10)}...
              </span>
              <span className="text-text-secondary text-[11px] truncate mx-[8px] max-w-[100px]">
                {txn.failure_class?.replace(/_/g, ' ')}
              </span>
              <span className="text-text-primary tabular-nums text-[11px]">
                {formatINRFromRupees(txn.amount_inr || 0)}
              </span>
            </div>
            <button
              onClick={() => onDraft(txn)}
              disabled={isDrafting === txn.transaction_id}
              className="opacity-0 group-hover:opacity-100 transition-opacity px-[8px] py-[2px] bg-accent/20 text-accent text-[10px] rounded border border-accent/30 hover:bg-accent hover:text-white flex-shrink-0"
            >
              {isDrafting === txn.transaction_id ? '...' : 'AI Email'}
            </button>
          </div>
        ))}
        {items.length > 20 && (
          <div className="text-text-tertiary text-[11px] text-center pt-[4px]">
            +{items.length - 20} more
          </div>
        )}
      </div>
    </div>
  );
}
