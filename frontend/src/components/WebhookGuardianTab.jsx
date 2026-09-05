import React, { useState, useEffect } from 'react';
import GuardianStatBar from './GuardianStatBar';
import RevenueImpactCard from './RevenueImpactCard';
import GuardianFeed from './GuardianFeed';
import { API_URL } from '../config';

export default function WebhookGuardianTab({ lastMessage }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'WEBHOOK_RECOVERY' && lastMessage.data) {
      setFeed((prev) => [lastMessage.data, ...prev]);
    }
  }, [lastMessage]);

  const handleRunGuardian = async () => {
    setLoading(true);
    setFeed([]);
    try {
      const res = await fetch(`${API_URL}/api/run-guardian`, { method: 'POST' });
      const data = await res.json();
      setReport(data);
      // Populate feed from recovered orders
      const simulatedFeed = data.recovered_orders.map(order => ({
        payment_id: order.razorpay_payment_id,
        order_id: order.order_id,
        amount_inr: order.amount_inr,
        customer_name: order.customer_name,
        product: order.product,
        timestamp: order.created_at,
        is_demo_simulation: order.is_demo_simulation
      }));
      setFeed(simulatedFeed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-24 space-y-16">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-semibold text-text-primary">Webhook Guardian</h2>
          <p className="text-[13px] text-text-secondary">Cross-checks captured payments against the order database to recover silent webhook failures.</p>
        </div>
        <button
          onClick={handleRunGuardian}
          disabled={loading}
          className="px-16 py-[6px] rounded-tag text-[13px] font-medium bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? 'Running check...' : 'Run Guardian'}
        </button>
      </div>

      {report && (
        <>
          <GuardianStatBar report={report} />
          
          <div className="grid grid-cols-3 gap-16">
            <div className="col-span-2">
              <GuardianFeed events={feed} />
            </div>
            <div className="col-span-1 space-y-16">
              <RevenueImpactCard report={report} />
              
              {report.unrecoverable_list.length > 0 && (
                <div className="bg-bg-surface rounded-card border border-danger/30 p-16">
                  <h3 className="text-danger text-[13px] font-medium mb-12">Unrecoverable (Missing Info)</h3>
                  <div className="space-y-[8px]">
                    {report.unrecoverable_list.map((u, i) => (
                      <div key={i} className="text-[12px] bg-bg-elevated p-[8px] rounded border border-border">
                        <span className="font-mono text-text-tertiary block mb-[4px]">{u.payment_id}</span>
                        <span className="text-text-secondary">{u.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
