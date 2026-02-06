import { LogViewer } from '@/components/LogViewer';
import { WalletStatus } from '@/components/WalletStatus';
import { ControlPanel } from '@/components/ControlPanel';
import { PipelineStatus } from '@/components/PipelineStatus';
import { MetricsPanel } from '@/components/MetricsPanel';
import { DecisionPanel } from '@/components/DecisionPanel';
import { MemoryPanel } from '@/components/MemoryPanel';
import { RateLimitPanel } from '@/components/RateLimitPanel';
import { DeploymentHistory } from '@/components/DeploymentHistory';
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

        <section className={styles.section}>
          <h2>Pipeline Status</h2>
          <PipelineStatus />
        </section>
      </div>

      <section className={styles.section}>
        <h2>Metrics</h2>
        <MetricsPanel />
      </section>

      <section className={styles.section}>
        <h2>API Limits</h2>
        <RateLimitPanel />
      </section>

      <section className={styles.section}>
        <h2>Latest Decision</h2>
        <DecisionPanel />
      </section>

      <section className={styles.section}>
        <h2>Deployment History</h2>
        <DeploymentHistory />
      </section>

      <section className={styles.section}>
        <h2>Memory Snapshot</h2>
        <MemoryPanel />
      </section>

      <section className={styles.section}>
        <h2>Decision Logs</h2>
        <LogViewer />
      </section>
    </div>
  );
}
