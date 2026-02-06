'use client';

import Link from 'next/link';
import styles from './AdminHeader.module.css';

export function AdminHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logo}>◈</span>
        <span>SYNTH Admin</span>
      </div>
      <nav className={styles.nav}>
        <Link href="/" className={styles.link}>Dashboard</Link>
        <Link href="/logs" className={styles.link}>Logs</Link>
        <Link href="/wallet" className={styles.link}>Wallet</Link>
        <Link href="/chat" className={styles.link}>Chat</Link>
        <Link href="/skills" className={styles.link}>Skills</Link>
      </nav>
    </header>
  );
}
