import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Polls GET /api/status every 2 seconds while the agent is running.
 * Returns the current batch status.
 */
export function useBatchStatus() {
  const [status, setStatus] = useState({
    status: 'idle',
    processed: 0,
    total: 200,
    recovered: 0,
    flagged: 0,
  });
  const intervalRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Silently fail — server might not be up yet
    }
  }, []);

  // Poll every 2 seconds
  useEffect(() => {
    fetchStatus(); // Initial fetch
    intervalRef.current = setInterval(fetchStatus, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus]);

  const startAgent = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/run-agent', { method: 'POST' });
      return await res.json();
    } catch (e) {
      console.error('[batch] Failed to start agent:', e);
      return { error: e.message };
    }
  }, []);

  const resetAgent = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/reset', { method: 'POST' });
      const data = await res.json();
      setStatus({ status: 'idle', processed: 0, total: 200, recovered: 0, flagged: 0 });
      return data;
    } catch (e) {
      console.error('[batch] Failed to reset agent:', e);
      return { error: e.message };
    }
  }, []);

  return { ...status, startAgent, resetAgent, refetch: fetchStatus };
}
