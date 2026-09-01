import React from 'react';
import { formatINRFromRupees } from '../lib/utils';

export default function GuardianFeed({ events }) {
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
              <th className="font-medium py-[8px] px-16">Customer</th>
              <th className="font-medium py-[8px] px-16 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="text-[12px] text-text-secondary">
            {events.length === 0 && (
              <tr>
                <td colSpan="5" className="py-24 text-center text-text-tertiary">
                  No orders recovered yet.
                </td>
              </tr>
            )}
            {events.map((ev, i) => (
              <tr key={i} className="border-b border-border/30 hover:bg-bg-elevated/30 transition-colors">
                <td className="py-[10px] px-16 font-mono text-[11px]">
                  {new Date(ev.timestamp).toLocaleTimeString('en-IN', { hour12: false })}
                </td>
                <td className="py-[10px] px-16 font-mono text-[11px] text-text-tertiary">
                  {ev.payment_id}
                </td>
                <td className="py-[10px] px-16 text-accent font-medium">
                  {ev.order_id}
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
