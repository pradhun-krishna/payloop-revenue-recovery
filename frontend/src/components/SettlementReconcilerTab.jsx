import React, { useState } from 'react';
import WeeklyDigestCard from './WeeklyDigestCard';
import GapPanel from './GapPanel';
import SettlementTable from './SettlementTable';
import { API_URL } from '../config';

export default function SettlementReconcilerTab() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRunReconciler = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/run-reconciliation`, { method: 'POST' });
      const data = await res.json();
      setReport(data);
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
          <h2 className="text-[18px] font-semibold text-text-primary">Settlement Reconciler</h2>
          <p className="text-[13px] text-text-secondary">Deterministically maps payouts to orders and flags accounting gaps.</p>
        </div>
        <button
          onClick={handleRunReconciler}
          disabled={loading}
          className="px-16 py-[6px] rounded-tag text-[13px] font-medium bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? 'Reconciling...' : 'Run Reconciler'}
        </button>
      </div>

      {report && report.gaps?.some(g => g.is_demo_simulation) && (
        <div className="p-16 rounded-card border border-accent bg-accent/15 flex items-center justify-between shadow-[0_0_15px_rgba(59,130,246,0.25)]">
          <div className="flex items-center gap-12">
            <span className="w-10 h-10 rounded-full bg-accent animate-ping" />
            <div>
              <h4 className="text-[14px] font-semibold text-accent flex items-center gap-8">
                <span>Audited Live Transaction: {report.gaps.find(g => g.is_demo_simulation)?.payment_id}</span>
                <span className="text-[10px] bg-accent/30 text-accent px-[6px] py-[2px] rounded-tag font-bold">SIMULATED</span>
              </h4>
              <p className="text-[12px] text-text-secondary mt-[2px]">
                Captured payment on Razorpay ledger verified against healed order. Balanced and accounted for next settlement cycle!
              </p>
            </div>
          </div>
          <span className="text-success font-mono font-bold text-[13px] bg-success/15 px-12 py-[4px] rounded-tag border border-success/30">
            100% BALANCED
          </span>
        </div>
      )}

      {report && (
        <div className="grid grid-cols-3 gap-16">
          {/* Left Column - Summaries & Settlements */}
          <div className="col-span-2 space-y-16">
            <WeeklyDigestCard report={report} />
            <SettlementTable summaries={report.summary_table} />
          </div>

          {/* Right Column - Gaps */}
          <div className="col-span-1">
            <GapPanel gaps={report.gaps} />
          </div>
        </div>
      )}
    </div>
  );
}
