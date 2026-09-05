import { useRef, useEffect } from 'react';
import {
  timeAgo,
  truncate,
  formatINRFromRupees,
  getClassColor,
  getMethodColor,
  getMethodLabel,
  getStatusDisplay,
  getActionLabel,
} from '../lib/utils';

/**
 * TransactionFeed — Live scrolling HTML table of processed transactions.
 * New rows slide in from the top with 150ms ease-out transition.
 */
export default function TransactionFeed({ transactions }) {
  const containerRef = useRef(null);
  const isAtBottomRef = useRef(true);

  // Auto-scroll to bottom when new items arrive (if user hasn't scrolled up)
  useEffect(() => {
    if (isAtBottomRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transactions.length]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  return (
    <div className="bg-bg-surface rounded-card border border-border overflow-hidden">
      <div className="px-16 py-12 border-b border-border">
        <h2 className="text-text-primary text-[14px] font-medium">
          Transaction feed
        </h2>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-y-auto"
        style={{ maxHeight: '480px' }}
      >
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-bg-elevated text-text-secondary text-[11px] tracking-label">
              <th className="text-left py-[8px] px-[12px] font-normal">Time</th>
              <th className="text-left py-[8px] px-[12px] font-normal">Transaction ID</th>
              <th className="text-right py-[8px] px-[12px] font-normal">Amount</th>
              <th className="text-left py-[8px] px-[12px] font-normal">Method</th>
              <th className="text-left py-[8px] px-[12px] font-normal">Failure</th>
              <th className="text-left py-[8px] px-[12px] font-normal">Class</th>
              <th className="text-left py-[8px] px-[12px] font-normal">Action</th>
              <th className="text-left py-[8px] px-[12px] font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center text-text-tertiary py-48 text-[13px]"
                >
                  Waiting for agent to start processing...
                </td>
              </tr>
            )}
            {transactions.map((txn, i) => (
              <TransactionRow key={txn.transaction_id || i} txn={txn} index={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TransactionRow({ txn, index }) {
  const { color: statusColor, label: statusLabel } = getStatusDisplay(txn.action_result);
  const classColor = getClassColor(txn.failure_class);
  const methodColor = getMethodColor(txn.payment_method);

  return (
    <tr
      className={`border-b transition-all duration-150 ease-out ${txn.is_demo_simulation ? 'border-accent/50 bg-accent/10 shadow-[inset_0_0_12px_rgba(var(--color-accent),0.2)]' : 'border-border/40'}`}
      style={{
        backgroundColor: txn.is_demo_simulation ? undefined : (index % 2 === 0 ? '#1A1D27' : '#1D2035'),
        animation: 'slideIn 150ms ease-out',
      }}
    >
      {/* Time */}
      <td
        className="py-[8px] px-[12px] text-text-tertiary whitespace-nowrap"
        title={txn.timestamp}
      >
        {timeAgo(txn.timestamp)}
      </td>

      {/* Transaction ID */}
      <td className="py-[8px] px-[12px] font-mono text-[12px] text-text-secondary">
        {txn.transaction_id ? txn.transaction_id.slice(0, 16) + '...' : '—'}
        {txn.is_demo_simulation && (
          <span className="ml-8 text-[10px] text-accent bg-accent/20 px-[6px] py-[2px] rounded-tag">SIMULATED</span>
        )}
      </td>

      {/* Amount */}
      <td className="py-[8px] px-[12px] text-text-primary text-right tabular-nums">
        {formatINRFromRupees(txn.amount_inr || 0)}
      </td>

      {/* Method */}
      <td className="py-[8px] px-[12px]">
        <span className="flex items-center gap-[6px]">
          <span
            className="w-[6px] h-[6px] rounded-full flex-shrink-0"
            style={{ backgroundColor: methodColor }}
          />
          <span className="text-text-secondary">
            {getMethodLabel(txn.payment_method)}
          </span>
        </span>
      </td>

      {/* Failure reason */}
      <td
        className="py-[8px] px-[12px] text-text-secondary max-w-[200px]"
        title={txn.failure_reason || txn.reason}
      >
        {truncate(txn.failure_reason || txn.reason, 35)}
      </td>

      {/* Class badge */}
      <td className="py-[8px] px-[12px]">
        <span
          className="inline-block px-[8px] py-[2px] rounded-tag text-[11px] font-medium"
          style={{
            backgroundColor: classColor + '18',
            color: classColor,
          }}
        >
          {txn.failure_class?.replace(/_/g, ' ') || '—'}
        </span>
      </td>

      {/* Action */}
      <td className="py-[8px] px-[12px] text-text-secondary text-[12px]">
        {getActionLabel(txn.action_taken)}
      </td>

      {/* Status */}
      <td className="py-[8px] px-[12px]">
        <span className="flex items-center gap-[6px]">
          <span
            className="w-[6px] h-[6px] rounded-full flex-shrink-0"
            style={{ backgroundColor: statusColor }}
          />
          <span style={{ color: statusColor }} className="text-[12px] font-medium">
            {statusLabel}
          </span>
        </span>
      </td>
    </tr>
  );
}
