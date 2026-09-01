import React, { useState } from 'react';
import WeeklyDigestCard from './WeeklyDigestCard';
import GapPanel from './GapPanel';
import SettlementTable from './SettlementTable';

export default function SettlementReconcilerTab() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRunReconciler = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/run-reconciliation', { method: 'POST' });
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
