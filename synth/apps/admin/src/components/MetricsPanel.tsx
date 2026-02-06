'use client';

import { useEffect, useState } from 'react';
import styles from './MetricsPanel.module.css';

interface MetricsData {
  totalDrops: number;
  contractsByType: Record<'token' | 'nft' | 'dapp' | 'contract', number>;
  suggestionsReceived: number;
  suggestionsBuilt: number;
  githubStars?: number;
  gasSpentEth?: string;
  rateLimits?: {
    github?: { remaining: number; limit: number; reset: string };
  };
}

export function MetricsPanel() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/metrics')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to load metrics')))
      .then(setMetrics)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <div className={styles.error}>Metrics unavailable.</div>;
  }

  if (!metrics) {
    return <div className={styles.loading}>Loading...</div>;
  }

  const totalContracts = Object.values(metrics.contractsByType).reduce((sum, value) => sum + value, 0);

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <span className={styles.value}>{metrics.totalDrops}</span>
        <span className={styles.label}>Total Drops</span>
      </div>
      <div className={styles.card}>
        <span className={styles.value}>{totalContracts}</span>
        <span className={styles.label}>Contracts Deployed</span>
      </div>
      <div className={styles.card}>
        <span className={styles.value}>{metrics.suggestionsReceived}</span>
        <span className={styles.label}>Suggestions Received</span>
      </div>
      <div className={styles.card}>
        <span className={styles.value}>{metrics.suggestionsBuilt}</span>
        <span className={styles.label}>Suggestions Built</span>
      </div>
      <div className={styles.card}>
        <span className={styles.value}>{metrics.githubStars ?? 0}</span>
        <span className={styles.label}>GitHub Stars</span>
      </div>
      <div className={styles.card}>
        <span className={styles.value}>{metrics.gasSpentEth ?? '0.000000'}</span>
        <span className={styles.label}>Gas Spent (ETH)</span>
      </div>
    </div>
  );
}
