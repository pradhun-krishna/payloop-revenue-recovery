import { formatINRFromRupees } from '../lib/utils';

/**
 * ExceptionPanel — Lists unresolved + escalated transactions.
 */
export default function ExceptionPanel({ transactions }) {
  const exceptions = transactions.filter(
    (t) =>
      t.action_result === 'escalated' ||
      t.action_result === 'failed' ||
      t.action_result === 'human_review'
  );

  const escalated = exceptions.filter((t) => t.action_result === 'escalated');
  const failed = exceptions.filter((t) => t.action_result === 'failed');
  const review = exceptions.filter((t) => t.action_result === 'human_review');

  return (
    <div className="bg-bg-surface rounded-card border border-border overflow-hidden">
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

      <div className="p-12" style={{ maxHeight: '280px', overflowY: 'auto' }}>
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
          />
        )}

        {failed.length > 0 && (
          <ExceptionGroup
            title="Failed recovery"
            items={failed}
            dotColor="#F5A623"
          />
        )}

        {review.length > 0 && (
          <ExceptionGroup
            title="Human review queue"
            items={review}
            dotColor="#8B90A7"
          />
        )}
      </div>
    </div>
  );
}

function ExceptionGroup({ title, items, dotColor }) {
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
            className="flex items-center justify-between text-[12px] py-[3px] px-[8px] rounded-indicator"
            style={{ backgroundColor: i % 2 === 0 ? 'transparent' : '#1D2035' }}
          >
            <span className="font-mono text-text-tertiary">
              {txn.transaction_id?.slice(0, 18) || '—'}
            </span>
            <span className="text-text-secondary text-[11px]">
              {txn.failure_class?.replace(/_/g, ' ')}
            </span>
            <span className="text-text-primary tabular-nums text-[11px]">
              {formatINRFromRupees(txn.amount_inr || 0)}
            </span>
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
