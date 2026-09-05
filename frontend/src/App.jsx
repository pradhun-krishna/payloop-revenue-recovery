import { useState, useEffect, useMemo, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useBatchStatus } from './hooks/useBatchStatus';
import StatBar from './components/StatBar';
import HaltBanner from './components/HaltBanner';
import TransactionFeed from './components/TransactionFeed';
import FailureBreakdown from './components/FailureBreakdown';
import RecoveryTimeline from './components/RecoveryTimeline';
import AgentActivityLog from './components/AgentActivityLog';
import BatchSummary from './components/BatchSummary';
import ExceptionPanel from './components/ExceptionPanel';
import TabSwitcher from './components/TabSwitcher';
import WebhookGuardianTab from './components/WebhookGuardianTab';
import SettlementReconcilerTab from './components/SettlementReconcilerTab';
import CopilotWidget from './components/CopilotWidget';
import RevenueChart from './components/RevenueChart';
import { API_URL } from './config';

export default function App() {
  const { messages, lastMessage, isConnected, clearMessages } = useWebSocket();
  const batchStatus = useBatchStatus();

  const [activeTab, setActiveTab] = useState('triage');
  const [processedTxns, setProcessedTxns] = useState([]);
  const [haltData, setHaltData] = useState(null);
  const [report, setReport] = useState(null);

  // Process incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'TXN_PROCESSED' && lastMessage.data) {
      setProcessedTxns((prev) => [...prev, lastMessage.data]);
    }

    if (lastMessage.type === 'BATCH_HALT') {
      setHaltData(lastMessage);
    }

    if (lastMessage.type === 'BATCH_COMPLETE') {
      setReport(lastMessage.report || null);
    }
  }, [lastMessage]);

  const handleStartAgent = useCallback(async () => {
    setProcessedTxns([]);
    setHaltData(null);
    setReport(null);
    clearMessages();
    await batchStatus.startAgent();
  }, [batchStatus, clearMessages]);

  const handleReset = useCallback(async () => {
    setProcessedTxns([]);
    setHaltData(null);
    setReport(null);
    clearMessages();
    await batchStatus.resetAgent();
  }, [batchStatus, clearMessages]);

  const [razorpayKey, setRazorpayKey] = useState(import.meta.env.VITE_RAZORPAY_KEY_ID || "");

  useEffect(() => {
    // Fetch razorpay key from backend if not defined in env
    fetch(`${API_URL}/api/config`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.razorpay_key_id) {
          setRazorpayKey(data.razorpay_key_id);
        }
      })
      .catch((err) => console.warn("Could not fetch razorpay config:", err));
  }, []);

  const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handleSimulate = async (scenario) => {
    let keyToUse = razorpayKey || import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!keyToUse) {
      try {
        const res = await fetch(`${API_URL}/api/config`);
        const data = await res.json();
        keyToUse = data.razorpay_key_id;
        if (keyToUse) setRazorpayKey(keyToUse);
      } catch (e) {
        console.error(e);
      }
    }

    try {
      const isLoaded = await loadRazorpay();
      if (!isLoaded || !keyToUse || keyToUse.includes("xxxxx")) {
        throw new Error("Razorpay SDK unavailable or invalid key");
      }

      const options = {
        key: keyToUse, 
        amount: scenario === 'drop' ? "249900" : "99900",
        currency: "INR",
        name: "PayLoop Demo Store",
        description: scenario === 'drop' ? "Demo Premium Plan" : "Demo Product",
        prefill: {
          name: scenario === 'drop' ? "Demo User (Dropped)" : "Demo User (Abandoned)",
          email: scenario === 'drop' ? "demo_drop@example.com" : "demo_fail@example.com",
          contact: scenario === 'drop' ? "8888888888" : "9999999999"
        },
        handler: async function (response) {
          if (scenario === 'drop') {
            try {
              await fetch(`${API_URL}/api/simulate/webhook-drop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ razorpay_payment_id: response.razorpay_payment_id })
              });
            } catch(e) {
              console.error(e);
            }
          }
        },
        modal: {
          ondismiss: async function() {
            if (scenario === 'fail') {
              try {
                await fetch(`${API_URL}/api/simulate/legitimate-failure`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ reason: 'Customer closed checkout modal' })
                });
              } catch(e) {
                console.error(e);
              }
            }
          }
        }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', async function (response) {
         if (scenario === 'fail') {
            try {
              await fetch(`${API_URL}/api/simulate/legitimate-failure`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ reason: response.error?.description || 'Payment failed', razorpay_payment_id: response.error?.metadata?.payment_id })
              });
            } catch(e) {}
         }
      });

      rzp.open();
    } catch (err) {
      console.warn("Direct checkout unavailable, triggering simulation backend directly:", err);
      const endpoint = scenario === 'drop' ? '/api/simulate/webhook-drop' : '/api/simulate/legitimate-failure';
      try {
        await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Simulated checkout event' })
        });
      } catch (e) {
        console.error("Simulation fallback failed:", e);
      }
    }
  };

  const stats = useMemo(() => {
    const recovered = processedTxns.filter((t) => t.action_result === 'success').length;
    const flagged = processedTxns.filter((t) => t.anomaly_flagged).length;
    return {
      total: batchStatus.total || 200,
      processed: processedTxns.length,
      recovered,
      flagged,
    };
  }, [processedTxns, batchStatus.total]);

  const isIdle = batchStatus.status === 'idle';
  const isRunning = batchStatus.status === 'running';

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <TabSwitcher activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {activeTab === 'triage' && (
        <div className="flex-1 flex flex-col">
          {/* Top stat bar */}
          <StatBar
            processed={stats.processed}
            total={stats.total}
            recovered={stats.recovered}
            flagged={stats.flagged}
            status={batchStatus.status}
          />

          {/* Halt banner */}
          {haltData && <HaltBanner haltData={haltData} />}

          {/* Control bar */}
          <div className="px-24 py-12 flex items-center justify-between border-b border-border/40">
            <div className="flex items-center gap-12">
              <h1 className="text-text-primary text-[16px] font-semibold">
                Payment failure triage
              </h1>
              <span className="text-text-tertiary text-[12px] font-mono">
                {isConnected ? 'ws connected' : 'ws disconnected'}
              </span>
            </div>

            <div className="flex items-center gap-[8px]">
              <button
                onClick={() => handleSimulate('fail')}
                className="px-12 py-[6px] rounded-tag text-[12px] font-medium bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors duration-150"
              >
                Simulate 201 (Legit Fail)
              </button>
              <button
                onClick={() => handleSimulate('drop')}
                className="px-12 py-[6px] rounded-tag text-[12px] font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20 transition-colors duration-150"
              >
                Simulate 202 (Webhook Drop)
              </button>
              {(isIdle || batchStatus.status === 'complete' || batchStatus.status === 'halted') && (
                <button
                  onClick={handleStartAgent}
                  className="px-16 py-[6px] rounded-tag text-[13px] font-medium bg-accent text-white hover:bg-accent/90 transition-colors duration-150"
                >
                  {batchStatus.status === 'complete' || batchStatus.status === 'halted'
                    ? 'Run again'
                    : 'Start agent'}
                </button>
              )}
              {(batchStatus.status === 'complete' || batchStatus.status === 'halted') && (
                <button
                  onClick={handleReset}
                  className="px-16 py-[6px] rounded-tag text-[13px] font-medium bg-bg-elevated text-text-secondary border border-border hover:bg-bg-elevated/80 transition-colors duration-150"
                >
                  Reset
                </button>
              )}
              {isRunning && (
                <span className="text-accent text-[13px] flex items-center gap-[6px]">
                  <span className="w-[6px] h-[6px] rounded-full bg-accent animate-pulse" />
                  Processing...
                </span>
              )}
            </div>
          </div>

          <div className="px-24 pt-16">
            <RevenueChart transactions={processedTxns} />
          </div>

          {/* Main two-column layout */}
          <div className="flex gap-[1px] px-24 py-16 flex-1 min-h-0">
            {/* Left column — 65% */}
            <div className="flex-[65] space-y-16 min-w-0">
              <TransactionFeed transactions={processedTxns} />
              <div className="grid grid-cols-2 gap-16">
                <FailureBreakdown transactions={processedTxns} />
                <RecoveryTimeline transactions={processedTxns} />
              </div>
            </div>

            {/* Right column — 35% */}
            <div className="flex-[35] space-y-16 ml-16 min-w-0">
              <AgentActivityLog messages={messages} />
              {report && <BatchSummary report={report} />}
              <ExceptionPanel transactions={processedTxns} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'guardian' && <WebhookGuardianTab lastMessage={lastMessage} />}
      {activeTab === 'reconciler' && <SettlementReconcilerTab />}
      
      <CopilotWidget />
    </div>
  );
}
