import React from 'react';
import { formatINRFromRupees } from '../lib/utils';

export default function SettlementTable({ summaries }) {
  if (!summaries) return null;

  return (
    <div className="bg-bg-surface border border-border rounded-card overflow-hidden">
      <div className="px-16 py-12 border-b border-border">
        <h3 className="text-[13px] font-medium text-text-primary">Settlement Batches</h3>
      </div>
      <table className="w-full text-left border-collapse">
        <thead className="bg-bg text-text-tertiary text-[11px]">
          <tr>
            <th className="font-medium py-[10px] px-16">ID / Cycle</th>
            <th className="font-medium py-[10px] px-16">Date</th>
            <th className="font-medium py-[10px] px-16 text-right">Gross</th>
            <th className="font-medium py-[10px] px-16 text-right">Net</th>
            <th className="font-medium py-[10px] px-16 text-center">Orders</th>
            <th className="font-medium py-[10px] px-16 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="text-[12px] text-text-secondary">
          {summaries.map((s, i) => (
            <tr key={i} className="border-b border-border/30 hover:bg-bg-elevated/30">
              <td className="py-[12px] px-16">
                <div className="font-mono text-text-primary text-[11px]">{s.settlement_id}</div>
                <div className="text-[11px] text-text-tertiary mt-[2px]">{s.cycle}</div>
              </td>
              <td className="py-[12px] px-16 text-[11px]">
                {new Date(s.settled_at).toLocaleDateString('en-IN')}
              </td>
              <td className="py-[12px] px-16 text-right font-mono">
                {formatINRFromRupees(s.gross_inr)}
              </td>
              <td className="py-[12px] px-16 text-right font-mono text-accent">
                {formatINRFromRupees(s.net_inr)}
              </td>
              <td className="py-[12px] px-16 text-center">
                {s.orders_count}
              </td>
              <td className="py-[12px] px-16 text-center">
                {s.status === 'clean' ? (
                  <span className="text-[11px] text-[#2DD4A0] bg-[#2DD4A0]/10 px-[6px] py-[2px] rounded border border-[#2DD4A0]/20">
                    Clean
                  </span>
                ) : (
                  <span className="text-[11px] text-warning bg-warning/10 px-[6px] py-[2px] rounded border border-warning/20">
                    {s.gaps_count} Gaps
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
