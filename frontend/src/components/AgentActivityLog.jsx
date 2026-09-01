import { useRef, useEffect, useState } from 'react';
import { formatTime, formatINRFromRupees } from '../lib/utils';

/**
 * AgentActivityLog — Terminal-style real-time log of agent decisions.
 * Auto-scrolls to bottom. Scroll-lock when user scrolls up.
 */
export default function AgentActivityLog({ messages }) {
  const containerRef = useRef(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showResume, setShowResume] = useState(false);

  useEffect(() => {
    if (isAutoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages.length, isAutoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 40;
    if (!atBottom && isAutoScroll) {
      setIsAutoScroll(false);
      setShowResume(true);
    } else if (atBottom) {
      setIsAutoScroll(true);
      setShowResume(false);
    }
  };

  const resumeScroll = () => {
    setIsAutoScroll(true);
    setShowResume(false);
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  return (
    <div className="bg-[#0D0F18] rounded-card border border-border overflow-hidden relative">
      <div className="px-16 py-12 border-b border-border/60 flex items-center justify-between">
        <h2 className="text-text-secondary text-[13px] font-medium">
          Agent activity log
        </h2>
        <span className="text-text-tertiary text-[11px] font-mono">
          {messages.length} entries
        </span>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-y-auto p-12 font-mono text-[12px] leading-[1.8]"
        style={{ maxHeight: '320px' }}
      >
        {messages.length === 0 && (
          <div className="text-text-tertiary text-center py-24">
            Agent log will appear here when processing starts...
          </div>
        )}
        {messages.map((msg, i) => (
          <LogEntry key={i} message={msg} />
        ))}
      </div>

      {/* Resume auto-scroll button */}
      {showResume && (
        <button
          onClick={resumeScroll}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-accent/20 text-accent
            text-[11px] px-12 py-[4px] rounded-tag hover:bg-accent/30 transition-colors
            duration-150 border border-accent/30"
        >
          Resume auto-scroll
        </button>
      )}
    </div>
  );
}

function LogEntry({ message }) {
  if (message.type === 'BATCH_HALT') {
    return (
      <div className="text-danger font-semibold">
        [{formatTime(new Date().toISOString())}]{' '}
        BATCH HALT: {message.reason}
      </div>
    );
  }

  if (message.type === 'ANOMALY_FLAG') {
    return (
      <div style={{ color: '#F5A623' }}>
        [{formatTime(new Date().toISOString())}]{' '}
        ANOMALY: {message.transaction_id?.slice(0, 16)}... amount{' '}
        {formatINRFromRupees(message.amount_inr)} flagged ({message.z_score}σ above mean)
      </div>
    );
  }

  if (message.type === 'BATCH_COMPLETE') {
    return (
      <div className="text-success font-semibold mt-[4px]">
        [{formatTime(new Date().toISOString())}]{' '}
        BATCH COMPLETE: {message.report?.processed || 0} transactions processed,{' '}
        {message.report?.recovered || 0} recovered ({message.report?.recovery_rate_pct || 0}%)
      </div>
    );
  }

  if (message.type !== 'TXN_PROCESSED') return null;

  const d = message.data;
  if (!d) return null;

  const txnId = d.transaction_id?.slice(0, 16) || '???';
  const time = formatTime(d.timestamp);
  const isEscalated = d.action_result === 'escalated';
  const isFailed = d.action_result === 'failed';
  const isSuccess = d.action_result === 'success';

  // First line: classification
  const classLine = (
    <div className="text-text-secondary">
      <span className="text-text-tertiary">[{time}]</span>{' '}
      {txnId}...{' '}
      <span className="text-text-secondary">CLASSIFIED</span> as{' '}
      <span style={{ color: getLogColor(d.failure_class) }}>{d.failure_class}</span>
      {' '}via <span className="text-text-tertiary">{d.classifier_stage}</span>
      {' → '}action: <span className="text-text-secondary">{d.action_taken}</span>
    </div>
  );

  // Second line: API result (if applicable)
  let apiLine = null;
  if (d.api_endpoint) {
    apiLine = (
      <div style={{ color: isSuccess ? '#2DD4A0' : isFailed ? '#FF4D6A' : '#8B90A7' }}>
        <span className="text-text-tertiary">[{time}]</span>{' '}
        {txnId}...{' '}
        API call {d.api_endpoint}{' → '}
        <span className="font-medium">
          {d.action_result} {d.mock_mode ? '(mock)' : ''}
        </span>
      </div>
    );
  } else if (isEscalated) {
    apiLine = (
      <div className="text-danger">
        <span className="text-text-tertiary">[{time}]</span>{' '}
        {txnId}...{' '}
        <span className="font-semibold">ESCALATED to security team — no retry</span>
      </div>
    );
  }

  return (
    <>
      {classLine}
      {apiLine}
    </>
  );
}

function getLogColor(failureClass) {
  const map = {
    NETWORK_TIMEOUT: '#4F7EFF',
    INSUFFICIENT_FUNDS_USER: '#F5A623',
    BANK_HARD_DECLINE: '#8B90A7',
    CARD_EXPIRY: '#A78BFA',
    UPI_TIMEOUT: '#38BDF8',
    FRAUD_BLOCK: '#FF4D6A',
  };
  return map[failureClass] || '#8B90A7';
}
