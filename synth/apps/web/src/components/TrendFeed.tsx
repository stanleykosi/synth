'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './TrendFeed.module.css';

interface TrendItem {
  id: string;
  source: string;
  summary: string;
  score: number;
  capturedAt: string;
}

export function TrendFeed() {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/trends')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to load trends')))
      .then((data: TrendItem[]) => {
        if (!mountedRef.current) return;
        setTrends(data);
        setLastUpdated(new Date().toISOString());
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        setError(err.message);
      })
      .finally(() => {
        if (!mountedRef.current) return;
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    const timer = setInterval(load, 15000);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [load]);

  if (error) {
    return (
      <div className={styles.error}>
        <p>Trend feed unavailable.</p>
      </div>
    );
  }

  return (
    <div className={styles.feed}>
      <div className={styles.header}>
        <h3>Live Trend Signals</h3>
        <div className={styles.headerRight}>
          <span className={styles.status}>
            {loading
              ? 'Updating…'
              : lastUpdated
                ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}`
                : 'Idle'}
          </span>
          <button onClick={load} className="btn btn-secondary" disabled={loading}>
            Refresh
          </button>
          <span className={styles.badge}>Auto</span>
        </div>
      </div>
      {trends.length === 0 ? (
        <div className={styles.empty}>No trends captured yet.</div>
      ) : (
        <div className={styles.list}>
          {trends
            .slice()
            .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
            .slice(0, 10)
            .map((trend) => (
            <div key={trend.id} className={styles.item}>
              <div className={styles.meta}>
                <span className={styles.source}>{trend.source}</span>
                <span className={styles.score}>Score {trend.score.toFixed(1)}</span>
              </div>
              <p className={styles.summary}>{trend.summary}</p>
              <time className={styles.time}>
                {new Date(trend.capturedAt).toLocaleString()}
              </time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
