'use client';

import { useEffect, useState } from 'react';
import styles from './DeploymentHistory.module.css';

interface DropItem {
  id: string;
  name: string;
  type: string;
  contractAddress: string;
  appMode?: 'onchain' | 'offchain';
  deployedAt: string;
  explorerUrl?: string;
  txHash?: string;
  gasCostEth?: string;
}

export function DeploymentHistory() {
  const [drops, setDrops] = useState<DropItem[]>([]);

  useEffect(() => {
    fetch('/api/drops')
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data: DropItem[]) => setDrops(data.slice(0, 6)))
      .catch(() => null);
  }, []);

  return (
    <div className={styles.card}>
      <h3>Deployment History</h3>
      {drops.length === 0 ? (
        <p className={styles.empty}>No deployments yet.</p>
      ) : (
        <div className={styles.list}>
          {drops.map((drop) => (
            <div key={drop.id} className={styles.item}>
              <div>
                <strong>{drop.name}</strong>
                <span className={styles.meta}>{drop.type}</span>
              </div>
              <div className={styles.metaRow}>
                <span>{new Date(drop.deployedAt).toLocaleString()}</span>
                <span>{drop.gasCostEth ? `${drop.gasCostEth} ETH` : 'Gas N/A'}</span>
              </div>
              <div className={styles.links}>
                {drop.explorerUrl && (
                  <a href={drop.explorerUrl} target="_blank" rel="noreferrer">Explorer</a>
                )}
                {!drop.explorerUrl && drop.appMode === 'offchain' && (
                  <span className={styles.mono}>Offchain build</span>
                )}
                {drop.txHash && (
                  <span className={styles.mono}>{drop.txHash.slice(0, 10)}…</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
