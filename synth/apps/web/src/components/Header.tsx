'use client';

import { ConnectButton } from './ConnectButton';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <a href="/" className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span className={styles.logoText}>SYNTH</span>
        </a>

        <nav className={styles.nav}>
          <a href="/drops" className={styles.navLink}>Drops</a>
          <a href="/suggest" className={styles.navLink}>Suggest</a>
          <a href="https://twitter.com/synth" target="_blank" className={styles.navLink} rel="noreferrer">Twitter</a>
        </nav>

        <ConnectButton />
      </div>
    </header>
  );
}
