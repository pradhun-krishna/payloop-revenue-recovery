import { useMemo } from 'react';
import { getClassColor } from '../lib/utils';

/**
 * FailureBreakdown — Pure CSS horizontal bar chart.
 * No charting library. Bars animate from 0 to final width over 600ms.
 */
export default function FailureBreakdown({ transactions }) {
  const data = useMemo(() => {
    const counts = {};
    for (const txn of transactions) {
      const cls = txn.failure_class || 'UNKNOWN';
      counts[cls] = (counts[cls] || 0) + 1;
    }

    const total = transactions.length || 1;
    const sorted = Object.entries(counts)
      .map(([cls, count]) => ({
        cls,
        count,
        pct: ((count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);

    return { sorted, maxCount: sorted[0]?.count || 1, total };
  }, [transactions]);

  const labels = {
    NETWORK_TIMEOUT: 'Network timeout',
    INSUFFICIENT_FUNDS_USER: 'Insufficient funds',
    BANK_HARD_DECLINE: 'Bank decline',
    FRAUD_BLOCK: 'Fraud block',
    CARD_EXPIRY: 'Card expiry',
    UPI_TIMEOUT: 'UPI timeout',
    UNKNOWN: 'Unknown',
  };

  return (
    <div className="bg-bg-surface rounded-card border border-border overflow-hidden">
      <div className="px-16 py-12 border-b border-border">
        <h2 className="text-text-primary text-[14px] font-medium">
          Failure breakdown
        </h2>
      </div>

      <div className="p-16 space-y-[12px]">
        {data.sorted.length === 0 && (
          <div className="text-text-tertiary text-[13px] text-center py-16">
            No data yet
          </div>
        )}
        {data.sorted.map(({ cls, count, pct }) => {
          const color = getClassColor(cls);
          const barWidthPct = (count / data.maxCount) * 100;

          return (
            <div key={cls} className="flex items-center gap-12">
              {/* Label */}
              <div className="w-[130px] text-[12px] text-text-secondary flex-shrink-0 truncate">
                {labels[cls] || cls}
              </div>

              {/* Bar */}
              <div className="flex-1 h-[20px] bg-bg-elevated rounded-indicator relative overflow-hidden">
                <div
                  className="h-full rounded-indicator"
                  style={{
                    width: `${barWidthPct}%`,
                    backgroundColor: color,
                    opacity: 0.75,
                    transition: 'width 600ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />
              </div>

              {/* Count + Percentage */}
              <div className="w-[70px] text-right text-[12px] flex-shrink-0">
                <span className="text-text-primary tabular-nums">{count}</span>
                <span className="text-text-tertiary ml-[4px]">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
