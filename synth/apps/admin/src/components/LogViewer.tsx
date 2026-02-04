'use client';

import { useEffect, useState } from 'react';
import styles from './LogViewer.module.css';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/logs')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to load logs')))
      .then(setLogs)
      .catch((err) => setError(err.message));
  }, []);

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
