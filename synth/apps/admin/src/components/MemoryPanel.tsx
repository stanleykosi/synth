'use client';

import { useEffect, useState } from 'react';
import styles from './MemoryPanel.module.css';

interface TrendItem {
  id: string;
  summary: string;
  score: number;
  capturedAt: string;
  source: string;
}

interface DropItem {
  id: string;
  name: string;
  type: string;
  contractAddress: string;
  deployedAt: string;
}

export function MemoryPanel() {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [drops, setDrops] = useState<DropItem[]>([]);

  useEffect(() => {
    fetch('/api/trends')
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data: TrendItem[]) => setTrends(data.slice(0, 5)))
      .catch(() => null);

    fetch('/api/drops')
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data: DropItem[]) => setDrops(data.slice(0, 5)))
      .catch(() => null);
  }, []);

  return (
    <div className={styles.panel}>
      <div className={styles.column}>
        <h3>Recent Trends</h3>
        {trends.length === 0 ? (
          <p className={styles.empty}>No trends yet.</p>
        ) : (
          trends.map((trend) => (
            <div key={trend.id} className={styles.item}>
              <span className={styles.meta}>{trend.source} • {trend.score.toFixed(1)}</span>
              <p>{trend.summary}</p>
            </div>
          ))
        )}
      </div>
      <div className={styles.column}>
        <h3>Recent Drops</h3>
        {drops.length === 0 ? (
          <p className={styles.empty}>No drops yet.</p>
        ) : (
          drops.map((drop) => (
            <div key={drop.id} className={styles.item}>
              <span className={styles.meta}>{drop.type}</span>
              <p>{drop.name}</p>
              <span className={styles.address}>{drop.contractAddress}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
