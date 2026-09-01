import { useMemo } from 'react';
import { getClassColor, formatTime } from '../lib/utils';

/**
 * RecoveryTimeline — Vertical timeline of agent decisions.
 * One entry per failure class showing recovered/failed counts.
 */
export default function RecoveryTimeline({ transactions }) {
  const timeline = useMemo(() => {
    const groups = {};

    for (const txn of transactions) {
      const cls = txn.failure_class || 'UNKNOWN';
      if (!groups[cls]) {
        groups[cls] = {
          cls,
          total: 0,
          recovered: 0,
          failed: 0,
          escalated: 0,
          review: 0,
          timestamps: [],
        };
      }
      groups[cls].total++;
      groups[cls].timestamps.push(txn.timestamp);

      if (txn.action_result === 'success') groups[cls].recovered++;
      else if (txn.action_result === 'failed') groups[cls].failed++;
      else if (txn.action_result === 'escalated') groups[cls].escalated++;
      else if (txn.action_result === 'human_review') groups[cls].review++;
    }

    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [transactions]);

  const actionDescriptions = {
    NETWORK_TIMEOUT: (g) =>
      `Retried ${g.total} network timeouts — ${g.recovered} recovered`,
    INSUFFICIENT_FUNDS_USER: (g) =>
      `Sent reminders to ${g.total} insufficient funds — ${g.recovered} recovered`,
    BANK_HARD_DECLINE: (g) =>
      `Flagged ${g.total} hard declines for human review`,
    CARD_EXPIRY: (g) =>
      `Sent update links for ${g.total} expired cards — ${g.recovered} recovered`,
    UPI_TIMEOUT: (g) =>
      `Retried ${g.total} UPI timeouts — ${g.recovered} recovered`,
    FRAUD_BLOCK: (g) =>
      `Escalated ${g.total} fraud-blocked transactions`,
  };

  const subDescriptions = {
    NETWORK_TIMEOUT: (g) =>
      g.failed > 0 ? `${g.failed} failed retry attempts — logged to exceptions` : null,
    INSUFFICIENT_FUNDS_USER: (g) =>
      g.failed > 0 ? `${g.failed} reminder deliveries failed` : null,
    CARD_EXPIRY: (g) =>
      g.failed > 0 ? `${g.failed} link sends failed` : null,
    UPI_TIMEOUT: (g) =>
      g.failed > 0 ? `${g.failed} retries failed` : null,
    FRAUD_BLOCK: (g) =>
      `All ${g.total} transactions halted — security team notified`,
    BANK_HARD_DECLINE: (g) =>
      `No retry attempts — decline rate protection active`,
  };

  if (timeline.length === 0) {
    return (
      <div className="bg-bg-surface rounded-card border border-border p-16">
        <h2 className="text-text-primary text-[14px] font-medium mb-12">
          Recovery timeline
        </h2>
        <div className="text-text-tertiary text-[13px] text-center py-16">
          Timeline will populate as the agent processes transactions
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-surface rounded-card border border-border overflow-hidden">
      <div className="px-16 py-12 border-b border-border">
        <h2 className="text-text-primary text-[14px] font-medium">
          Recovery timeline
        </h2>
      </div>

      <div className="p-16">
        {timeline.map((group, i) => {
          const color = getClassColor(group.cls);
          const lastTimestamp = group.timestamps[group.timestamps.length - 1];
          const getDesc = actionDescriptions[group.cls];
          const getSubDesc = subDescriptions[group.cls];
          const desc = getDesc ? getDesc(group) : `Processed ${group.total} ${group.cls}`;
          const subDesc = getSubDesc ? getSubDesc(group) : null;

          return (
            <div key={group.cls} className="flex gap-12 mb-16 last:mb-0">
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center flex-shrink-0 w-[20px]">
                <div
                  className="w-[10px] h-[10px] rounded-full flex-shrink-0 mt-[4px]"
                  style={{ backgroundColor: color }}
                />
                {i < timeline.length - 1 && (
                  <div className="w-[1px] flex-1 mt-[4px] bg-border" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-text-tertiary text-[11px] font-mono mb-[2px]">
                  {formatTime(lastTimestamp)}
                </div>
                <div className="text-text-primary text-[13px] leading-[1.5]">
                  {desc}
                </div>
                {subDesc && (
                  <div className="text-text-tertiary text-[12px] mt-[2px]">
                    {subDesc}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
