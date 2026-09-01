/**
 * BatchSummary — Displays the NL summary from Gemini and key report metrics.
 * Appears only after the agent run completes.
 */
export default function BatchSummary({ report }) {
  if (!report || !report.total_transactions) return null;

  return (
    <div className="bg-bg-surface rounded-card border border-border overflow-hidden">
      <div className="px-16 py-12 border-b border-border">
        <h2 className="text-text-primary text-[14px] font-medium">
          Batch summary
        </h2>
      </div>

      <div className="p-16">
        {/* NL Summary */}
        {report.nl_summary && (
          <p className="text-text-secondary text-[14px] leading-body mb-16">
            {report.nl_summary}
          </p>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-[8px]">
          <MetricPill label="Recovery rate" value={`${report.recovery_rate_pct}%`} color="#2DD4A0" />
          <MetricPill label="Human review" value={report.human_review_queue} color="#F5A623" />
          <MetricPill label="Escalated" value={report.escalated} color="#FF4D6A" />
          <MetricPill label="Anomalies flagged" value={report.anomaly_flagged_count} color="#F5A623" />
          <MetricPill
            label="False interventions"
            value={report.false_interventions}
            color={report.false_interventions > 0 ? '#FF4D6A' : '#2DD4A0'}
          />
          <MetricPill
            label="False intervention cost"
            value={`₹${report.false_intervention_cost_inr?.toFixed(2) || '0.00'}`}
            color="#8B90A7"
          />
        </div>

        {/* Run info */}
        <div className="mt-12 pt-12 border-t border-border/50">
          <div className="text-text-tertiary text-[11px] font-mono">
            Run ID: {report.run_id?.slice(0, 8)}...
          </div>
          <div className="text-text-tertiary text-[11px] font-mono">
            Completed: {report.run_timestamp ? new Date(report.run_timestamp).toLocaleString('en-IN') : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricPill({ label, value, color }) {
  return (
    <div className="bg-bg-elevated rounded-tag px-12 py-[8px]">
      <div className="text-text-tertiary text-[11px] tracking-label mb-[2px]">
        {label}
      </div>
      <div
        className="text-[16px] font-semibold tracking-display tabular-nums"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}
