import React from 'react';
import { formatINRFromRupees } from '../lib/utils';

export default function GuardianFeed({ events }) {
  // Sort so SIMULATED transactions are ALWAYS pinned to Row #1 at the top!
  const sortedEvents = [...events].sort((a, b) => {
    if (a.is_demo_simulation && !b.is_demo_simulation) return -1;
    if (!a.is_demo_simulation && b.is_demo_simulation) return 1;
    return 0;
  });

  return (
    <div className="bg-bg-surface border border-border rounded-card overflow-hidden">
      <div className="px-16 py-12 border-b border-border">
        <h3 className="text-[13px] font-medium text-text-primary">Auto-Recovered Orders</h3>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
        <table className="w-full text-left border-collapse">
          <thead className="bg-bg text-text-tertiary text-[11px] sticky top-0">
            <tr>
              <th className="font-medium py-[8px] px-16">Timestamp</th>
              <th className="font-medium py-[8px] px-16">Payment ID</th>
              <th className="font-medium py-[8px] px-16">Created Order</th>
              <th className="font-medium py-[8px] px-16">Recovery Action</th>
              <th className="font-medium py-[8px] px-16">Customer</th>
              <th className="font-medium py-[8px] px-16 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="text-[12px] text-text-secondary">
            {sortedEvents.length === 0 && (
              <tr>
                <td colSpan="6" className="py-24 text-center text-text-tertiary">
                  No orders recovered yet.
                </td>
              </tr>
            )}
            {sortedEvents.map((ev, i) => (
              <tr key={i} className={`border-b transition-colors ${ev.is_demo_simulation ? 'border-accent bg-accent/15 shadow-[inset_0_0_12px_rgba(59,130,246,0.3)] font-semibold' : 'border-border/30 hover:bg-bg-elevated/30'}`}>
                <td className="py-[10px] px-16 font-mono text-[11px]">
                  {new Date(ev.timestamp).toLocaleTimeString('en-IN', { hour12: false })}
                </td>
                <td className="py-[10px] px-16 font-mono text-[11px] text-text-tertiary">
                  {ev.payment_id}
                  {ev.is_demo_simulation && (
                    <span className="ml-8 text-[10px] text-accent bg-accent/20 px-[6px] py-[2px] rounded-tag">SIMULATED</span>
                  )}
                </td>
                <td className="py-[10px] px-16 text-accent font-medium">
                  {ev.order_id}
                </td>
                <td className="py-[10px] px-16">
                  {ev.was_authorized_capture ? (
                    <span className="inline-flex items-center gap-[4px] text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-[8px] py-[2px] rounded-tag">
                      <span>⚡ Auto-Captured (Razorpay API)</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-text-secondary">
                      Order auto-created
                    </span>
                  )}
                </td>
                <td className="py-[10px] px-16">
                  {ev.customer_name}
                </td>
                <td className="py-[10px] px-16 text-right font-mono text-text-primary">
                  {formatINRFromRupees(ev.amount_inr)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
