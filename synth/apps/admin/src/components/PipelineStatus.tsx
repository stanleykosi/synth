'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './PipelineStatus.module.css';

interface AgentStatus {
  paused: boolean;
  currentPhase: string;
  lastRunAt?: string;
  lastResult?: string;
  lastError?: string;
  lastSignalAt?: string;
  lastSignalResult?: string;
  lastSignalError?: string;
}

export function PipelineStatus() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(() => {
    fetch('/api/status')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to load status')))
      .then((data: AgentStatus) => {
        if (!mountedRef.current) return;
        setStatus(data);
        setError(null);
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        setError(err.message);
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    const timer = setInterval(load, 10000);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [load]);

  if (error) {
    return <div className={styles.error}>Status unavailable.</div>;
  }

  if (!status) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <span className={styles.label}>Phase</span>
        <span className={styles.value}>{status.currentPhase}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Paused</span>
        <span className={styles.value}>{status.paused ? 'Yes' : 'No'}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Last Run</span>
        <span className={styles.value}>{status.lastRunAt ?? '—'}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Last Result</span>
        <span className={styles.value}>{status.lastResult ?? '—'}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Last Detection</span>
        <span className={styles.value}>{status.lastSignalAt ?? '—'}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Detection Result</span>
        <span className={styles.value}>{status.lastSignalResult ?? '—'}</span>
      </div>
      {status.lastError && (
        <div className={styles.errorDetail}>Error: {status.lastError}</div>
      )}
      {status.lastSignalError && (
        <div className={styles.errorDetail}>Detection Error: {status.lastSignalError}</div>
      )}
    </div>
  );
}
