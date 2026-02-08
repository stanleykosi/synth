"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Wallet } from "lucide-react";
import styles from "./ConnectButton.module.css";

export function ConnectButton() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (mounted && isConnected && address) {
    return (
      <button className={styles.connected} onClick={() => disconnect()}>
        <span className={styles.dot} />
        <span className={styles.address}>
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </button>
    );
  }

  return (
    <button
      className={styles.connectBtn}
      onClick={() => connect({ connector: injected() })}
    >
      <Wallet size={16} />
      Connect
    </button>
  );
}
