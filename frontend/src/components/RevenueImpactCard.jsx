import React from 'react';
import { formatINRFromRupees } from '../lib/utils';

export default function RevenueImpactCard({ report }) {
  if (!report) return null;

  return (
    <div className="bg-bg-surface border border-border rounded-card p-16">
      <h3 className="text-[13px] font-medium text-text-primary mb-16">Revenue Impact</h3>
      
      <div className="space-y-16">
        <div>
          <div className="text-[11px] text-text-tertiary mb-[4px]">REVENUE AT RISK</div>
          <div className="text-[20px] font-mono text-warning">
            {formatINRFromRupees(report.revenue_at_risk_inr)}
          </div>
        </div>
        
        <div className="pt-16 border-t border-border/50">
          <div className="text-[11px] text-text-tertiary mb-[4px]">REVENUE SAVED</div>
          <div className="text-[24px] font-mono text-accent">
            {formatINRFromRupees(report.revenue_recovered_inr)}
          </div>
        </div>
      </div>
    </div>
  );
}
