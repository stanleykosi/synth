'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  appMode?: 'onchain' | 'offchain';
  deployedAt: string;
}

export function MemoryPanel() {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [drops, setDrops] = useState<DropItem[]>([]);
  const mountedRef = useRef(true);

  const load = useCallback(() => {
    fetch('/api/trends')
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data: TrendItem[]) => {
        if (!mountedRef.current) return;
        setTrends(data.slice(0, 5));
      })
      .catch(() => null);

    fetch('/api/drops')
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data: DropItem[]) => {
        if (!mountedRef.current) return;
        setDrops(data.slice(0, 5));
      })
      .catch(() => null);
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
              <span className={styles.address}>
                {drop.contractAddress ? drop.contractAddress : (drop.appMode === 'offchain' ? 'Offchain app' : 'No contract')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
