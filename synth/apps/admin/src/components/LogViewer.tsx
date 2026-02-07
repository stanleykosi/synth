'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './LogViewer.module.css';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(() => {
    fetch('/api/logs')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to load logs')))
      .then((data: LogEntry[]) => {
        if (!mountedRef.current) return;
        setLogs(data);
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
    return <div className={styles.error}>Logs unavailable.</div>;
  }

  return (
    <div className={styles.viewer}>
      {logs.map((log, i) => (
        <div key={i} className={`${styles.entry} ${styles[log.level]}`}>
          <span className={styles.time}>{log.timestamp}</span>
          <span className={styles.level}>[{log.level.toUpperCase()}]</span>
          <span className={styles.message}>{log.message}</span>
        </div>
      ))}
    </div>
  );
}
