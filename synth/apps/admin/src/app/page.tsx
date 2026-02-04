import { LogViewer } from '@/components/LogViewer';
import { WalletStatus } from '@/components/WalletStatus';
import { ControlPanel } from '@/components/ControlPanel';
import styles from './page.module.css';

export default function AdminDashboard() {
  return (
    <div className={styles.dashboard}>
      <h1>SYNTH Admin</h1>

      <div className={styles.grid}>
        <section className={styles.section}>
          <h2>Wallet Status</h2>
          <WalletStatus />
        </section>

        <section className={styles.section}>
          <h2>Controls</h2>
          <ControlPanel />
        </section>
      </div>

      <section className={styles.section}>
        <h2>Decision Logs</h2>
        <LogViewer />
      </section>
    </div>
  );
}
