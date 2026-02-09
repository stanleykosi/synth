import { LogViewer } from "@/components/LogViewer";
import { WalletStatus } from "@/components/WalletStatus";
import { ControlPanel } from "@/components/ControlPanel";
import { PipelineStatus } from "@/components/PipelineStatus";
import { MetricsPanel } from "@/components/MetricsPanel";
import { DecisionPanel } from "@/components/DecisionPanel";
import { MemoryPanel } from "@/components/MemoryPanel";
import { RateLimitPanel } from "@/components/RateLimitPanel";
import { DeploymentHistory } from "@/components/DeploymentHistory";
import { QueuePanel } from "@/components/QueuePanel";
import styles from "./page.module.css";

export default function AdminDashboard() {
  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>SYNTH Control Center</h1>

      <div className={styles.grid}>
        <section className={`${styles.section} ${styles["span-6"]}`}>
          <header>
            <h2>Wallet</h2>
          </header>
          <WalletStatus />
        </section>

        <section className={`${styles.section} ${styles["span-6"]}`}>
          <header>
            <h2>Pipeline Status</h2>
          </header>
          <PipelineStatus />
        </section>

        <section className={`${styles.section} ${styles["span-12"]}`}>
          <header>
            <h2>Pipeline Priority</h2>
          </header>
          <ControlPanel />
        </section>

        <section className={`${styles.section} ${styles["span-6"]}`}>
          <h2>Metrics</h2>
          <MetricsPanel />
        </section>

        <section className={`${styles.section} ${styles["span-6"]}`}>
          <h2>Queue</h2>
          <QueuePanel />
        </section>

        <section className={`${styles.section} ${styles["span-4"]}`}>
          <header>
            <h2>API Quotas</h2>
          </header>
          <RateLimitPanel />
        </section>

        <section className={`${styles.section} ${styles["span-8"]}`}>
          <header>
            <h2>Execution Metrics</h2>
          </header>
          <MetricsPanel />
        </section>

        <section className={`${styles.section} ${styles["span-12"]}`}>
          <header>
            <h2>Deployment History</h2>
          </header>
          <DeploymentHistory />
        </section>

        <section className={`${styles.section} ${styles["span-12"]}`}>
          <header>
            <h2>Cognitive Process</h2>
          </header>
          <DecisionPanel />
        </section>

        <section className={`${styles.section} ${styles["span-12"]}`}>
          <header>
            <h2>Memory Heap Snapshot</h2>
          </header>
          <MemoryPanel />
        </section>
      </div>
    </div>
  );
}
