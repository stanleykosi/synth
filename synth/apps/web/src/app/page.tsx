import { ArrowRight, Zap } from "lucide-react";
import { Metrics } from "@/components/Metrics";
import { DropCard } from "@/components/DropCard";
import { TrendFeed } from "@/components/TrendFeed";
import type { Drop, Metrics as MetricsPayload } from "@/lib/api";
import { fetchDrops, fetchMetrics } from "@/lib/api";
import styles from "./page.module.css";

async function getDrops(): Promise<Drop[]> {
  try {
    return await fetchDrops();
  } catch {
    return [];
  }
}

async function getMetrics(): Promise<MetricsPayload> {
  try {
    return await fetchMetrics();
  } catch {
    return {
      totalDrops: 0,
      contractsByType: { token: 0, nft: 0, dapp: 0, contract: 0 },
      suggestionsReceived: 0,
      suggestionsBuilt: 0,
    };
  }
}

export default async function HomePage() {
  const [drops, metrics] = await Promise.all([getDrops(), getMetrics()]);
  const totalContracts = Object.values(metrics.contractsByType).reduce(
    (sum, v) => sum + v,
    0,
  );

  return (
    <div className={styles.page}>
      <div className={styles.bentoGrid}>
        {/* Hero & Metrics Combined Section */}
        <section className={styles.heroCombined}>
          <div className={styles.heroContent}>
            <p className={styles.subtitle}>
              Autonomous Onchain Synthesis Engine
            </p>
            <h1 className={styles.title}>SYNTHCLAW</h1>
            <p className={styles.tagline}>
              From noise to signal. Watch agent and subagents build and deploy products daily.
            </p>
            <div className={styles.heroCta}>
              <a href="/drops" className="btn btn-primary">
                View Drops
                <ArrowRight size={16} />
              </a>
              <a href="/suggest" className="btn btn-secondary">
                <Zap size={16} />
                Inject Signal
              </a>
            </div>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.statsContainer}>
              <div className={`${styles.metricCard} ${styles.orange}`}>
                <span className={styles.metricValue}>
                  {metrics.totalDrops.toLocaleString()}
                </span>
                <span className={styles.metricLabel}>Total Drops</span>
              </div>
              <div className={`${styles.metricCard} ${styles.blue}`}>
                <span className={styles.metricValue}>
                  {totalContracts.toLocaleString()}
                </span>
                <span className={styles.metricLabel}>Contracts</span>
              </div>
              <div className={`${styles.metricCard} ${styles.teal}`}>
                <span className={styles.metricValue}>
                  {metrics.suggestionsReceived.toLocaleString()}
                </span>
                <span className={styles.metricLabel}>Signal Received</span>
              </div>
              <div className={`${styles.metricCard} ${styles.gold}`}>
                <span className={styles.metricValue}>
                  {metrics.suggestionsBuilt.toLocaleString()}
                </span>
                <span className={styles.metricLabel}>Signal Built</span>
              </div>
              <div className={`${styles.metricCard} ${styles.rose}`}>
                <span className={styles.metricValue}>
                  {metrics.githubStars?.toLocaleString() || "0"}
                </span>
                <span className={styles.metricLabel}>GitHub Stars</span>
              </div>
              <div className={`${styles.metricCard} ${styles.purple}`}>
                <span className={styles.metricValue}>
                  {metrics.gasSpentEth || "0"}
                </span>
                <span className={styles.metricLabel}>Gas Spent (ETH)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Signal Feed Card */}
        <section className={styles.feedCard}>
          <div className={styles.cardHeader}>
            <h2>Signal Feed</h2>
          </div>
          <TrendFeed />
        </section>

        {/* Recent Drops Section */}
        <section className={styles.dropsSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <h2>Recent Drops</h2>
            </div>
            <a href="/drops" className={styles.viewAll}>
              View all <ArrowRight size={14} />
            </a>
          </div>
          <div className={styles.dropGrid}>
            {drops.slice(0, 3).map((drop) => (
              <DropCard key={drop.id} drop={drop} />
            ))}
          </div>
        </section>

        {/* How SYNTH Works Section */}
        <section className={styles.stepsSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <h2>How SYNTH Works</h2>
            </div>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={`${styles.stepNumber} ${styles.primary}`}>01</div>
              <h3>Signal Detection</h3>
              <p>SYNTH monitors web/news, Farcaster, onchain Dune queries, and community suggestions for emerging trends.</p>
            </div>
            <div className={styles.step}>
              <div className={`${styles.stepNumber} ${styles.secondary}`}>
                02
              </div>
              <h3>Synthesis</h3>
              <p>
                The AI designs and builds the appropriate solution—token, NFT,
                or dApp.
              </p>
            </div>
            <div className={styles.step}>
              <div className={`${styles.stepNumber} ${styles.tertiary}`}>
                03
              </div>
              <h3>Deployment</h3>
              <p>
                After testnet verification, contracts deploy to Base mainnet.
              </p>
            </div>
            <div className={styles.step}>
              <div className={`${styles.stepNumber} ${styles.primary}`}>04</div>
              <h3>Broadcast</h3>
              <p>
                Every drop is open-sourced and announced on Twitter/Farcaster.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
