'use client';

import { useEffect, useState } from 'react';
import styles from './RateLimitPanel.module.css';

interface RateLimitInfo {
  remaining: number;
  limit: number;
  reset: string;
}

interface MetricsData {
  rateLimits?: {
    github?: RateLimitInfo;
  };
}

export function RateLimitPanel() {
  const [github, setGithub] = useState<RateLimitInfo | null>(null);

  useEffect(() => {
    fetch('/api/metrics')
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data: MetricsData) => setGithub(data.rateLimits?.github ?? null))
      .catch(() => null);
  }, []);

  return (
    <div className={styles.card}>
      <h3>API Rate Limits</h3>
      {github ? (
        <div className={styles.row}>
          <span>GitHub</span>
          <span>{github.remaining}/{github.limit}</span>
          <time>{new Date(github.reset).toLocaleTimeString()}</time>
        </div>
      ) : (
        <p className={styles.empty}>GitHub rate limit unavailable.</p>
      )}
    </div>
  );
}
