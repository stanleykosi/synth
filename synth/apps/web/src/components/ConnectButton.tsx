'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import styles from './ConnectButton.module.css';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        className={styles.connected}
        onClick={() => disconnect()}
      >
        <span className={styles.dot} />
        <span className={styles.address}>
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </button>
    );
  }

  return (
    <button
      className="btn btn-primary"
      onClick={() => connect({ connector: injected() })}
    >
      Connect
    </button>
  );
}
