import React from 'react';
import { formatINRFromRupees } from '../lib/utils';

export default function GuardianStatBar({ report }) {
  if (!report) return null;

  return (
    <div className="grid grid-cols-4 gap-[1px] bg-border border border-border rounded-card overflow-hidden">
      <StatBox label="Payments Checked" value={report.total_payments_checked} />
      <StatBox label="Matched Orders" value={report.orders_matched} color="#2DD4A0" />
      <StatBox label="Failures Detected" value={report.webhook_failures_detected} color="#F5A623" />
      <StatBox label="Auto-Recovered" value={report.webhook_failures_recovered} color="#3B82F6" />
    </div>
  );
}

function StatBox({ label, value, color = '#E8EAF0' }) {
  return (
    <div className="bg-bg-surface p-16">
      <div className="text-text-tertiary text-[11px] tracking-label mb-[4px] uppercase">{label}</div>
      <div className="text-[24px] font-semibold tracking-display" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
