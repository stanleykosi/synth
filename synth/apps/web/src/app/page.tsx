import { Metrics } from '@/components/Metrics';
import { DropCard } from '@/components/DropCard';
import { TrendFeed } from '@/components/TrendFeed';
import type { Drop, Metrics as MetricsPayload } from '@/lib/api';
import { fetchDrops, fetchMetrics } from '@/lib/api';
import styles from './page.module.css';

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
      suggestionsBuilt: 0
    };
  }
}

export default async function HomePage() {
  const [drops, metrics] = await Promise.all([getDrops(), getMetrics()]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            <span className={styles.titleAccent}>◈</span> SYNTH
          </h1>
          <p className={styles.subtitle}>
            Autonomous Onchain Synthesis Engine
          </p>
          <p className={styles.tagline}>
            From noise to signal. Watch an AI build and deploy products daily.
          </p>
          <div className={styles.heroCta}>
            <a href="/drops" className="btn btn-primary">View All Drops</a>
            <a href="/suggest" className="btn btn-secondary">Inject Signal</a>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <Metrics data={metrics} />
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Signal Feed</h2>
          </div>
          <TrendFeed />
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Recent Drops</h2>
            <a href="/drops" className={styles.viewAll}>View all →</a>
          </div>
          <div className={styles.dropGrid}>
            {drops.slice(0, 3).map((drop) => (
              <DropCard key={drop.id} drop={drop} />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <h2 className="text-center mb-lg">How SYNTH Works</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>01</div>
              <h3>Signal Detection</h3>
              <p>SYNTH monitors Twitter, Farcaster, Discord, and onchain data for emerging trends.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>02</div>
              <h3>Synthesis</h3>
              <p>The AI designs and builds the appropriate solution—token, NFT, or dApp.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>03</div>
              <h3>Deployment</h3>
              <p>After testnet verification, contracts deploy to Base mainnet.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>04</div>
              <h3>Broadcast</h3>
              <p>Every drop is open-sourced and announced on Twitter/Farcaster.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
