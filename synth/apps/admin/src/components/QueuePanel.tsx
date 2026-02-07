'use client';

import { useEffect, useState } from 'react';
import styles from './QueuePanel.module.css';

interface QueueItem {
  id: string;
  type: string;
  requestedAt: string;
  requestedBy: string;
  reason?: string;
  force?: boolean;
  source?: string;
  priority: number;
}

interface QueueState {
  items: QueueItem[];
  active?: {
    id: string;
    type?: string;
    startedAt: string;
  };
}

export function QueuePanel() {
  const [queue, setQueue] = useState<QueueState>({ items: [] });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      fetch('/api/queue')
        .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to load queue')))
        .then((data: QueueState) => {
          if (mounted) setQueue(data);
        })
        .catch((err) => {
          if (mounted) setError(err.message);
        });
    };
    load();
    const timer = setInterval(load, 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  if (error) {
    return <div className={styles.error}>Queue unavailable.</div>;
  }

  return (
    <div className={styles.card}>
      <h3>Run Queue</h3>
      {queue.active && (
        <div className={styles.active}>
          <span>Active {queue.active.type ? `(${queue.active.type})` : ''}</span>
          <strong>{queue.active.id}</strong>
          <span>{new Date(queue.active.startedAt).toLocaleString()}</span>
        </div>
      )}
      {queue.items.length === 0 ? (
        <p className={styles.empty}>No queued runs.</p>
      ) : (
        <div className={styles.list}>
          {queue.items.map((item) => (
            <div key={item.id} className={styles.item}>
              <div className={styles.row}>
                <strong>{item.id}</strong>
                <span className={styles.meta}>{item.type} · {item.requestedBy}</span>
              </div>
              <div className={styles.row}>
                <span>{new Date(item.requestedAt).toLocaleString()}</span>
                <span>{item.force ? 'Force' : 'Normal'}</span>
              </div>
              {item.reason && <p className={styles.reason}>{item.reason}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
