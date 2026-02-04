'use client';

import { useEffect, useState } from 'react';
import styles from './WalletStatus.module.css';

interface WalletData {
  address: string;
  balance: string;
  nonce: number;
}

export function WalletStatus() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/wallet')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to load wallet')))
      .then(setWallet)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className={styles.error}>Wallet unavailable.</div>;
  if (!wallet) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <span className={styles.label}>Address</span>
        <code className={styles.value}>{wallet.address}</code>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Balance</span>
        <span className={styles.value}>{wallet.balance} ETH</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Nonce</span>
        <span className={styles.value}>{wallet.nonce}</span>
      </div>
    </div>
  );
}
