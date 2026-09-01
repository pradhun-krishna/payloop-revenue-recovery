import React from 'react';
import { formatINRFromRupees } from '../lib/utils';

export default function WeeklyDigestCard({ report }) {
  if (!report) return null;

  return (
    <div className="bg-bg-surface border border-border rounded-card p-24">
      <div className="flex items-start justify-between mb-24">
        <div>
          <h3 className="text-[14px] font-medium text-text-primary mb-[4px]">Weekly Digest</h3>
          <p className="text-[12px] text-text-tertiary">Period: {report.period} • Run: {new Date(report.run_at).toLocaleString()}</p>
        </div>
        <div className="bg-accent/10 text-accent px-12 py-[4px] rounded-tag text-[11px] font-mono border border-accent/20">
          AI SUMMARY
        </div>
      </div>

      <div className="bg-bg-elevated rounded border border-border p-16 mb-24">
        <p className="text-[14px] leading-relaxed text-text-secondary">
          {report.nl_summary}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-16 border-t border-border/50 pt-24">
        <div>
          <div className="text-[11px] text-text-tertiary mb-[4px]">TOTAL GROSS</div>
          <div className="text-[18px] font-mono text-text-primary">
            {formatINRFromRupees(report.total_gross_inr)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-text-tertiary mb-[4px]">TOTAL FEES + GST</div>
          <div className="text-[18px] font-mono text-text-secondary">
            {formatINRFromRupees(report.total_fees_inr)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-text-tertiary mb-[4px]">TOTAL NET</div>
          <div className="text-[18px] font-mono text-accent">
            {formatINRFromRupees(report.total_net_inr)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-text-tertiary mb-[4px]">ORDERS MATCHED</div>
          <div className="text-[18px] font-semibold text-text-primary">
            {report.total_orders_matched}
          </div>
        </div>
      </div>
    </div>
  );
}
