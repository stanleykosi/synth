import styles from './DropCard.module.css';

interface Drop {
  id: string;
  name: string;
  description: string;
  type: 'token' | 'nft' | 'dapp' | 'contract';
  contractAddress: string;
  githubUrl: string;
  webappUrl?: string;
  explorerUrl?: string;
  network?: string;
  deployedAt: string;
  trend: string;
  trendSource?: string;
  trendScore?: number;
  txHash?: string;
  gasCostEth?: string;
}

export function DropCard({ drop }: { drop: Drop }) {
  const typeColors = {
    token: 'var(--accent-primary)',
    nft: 'var(--accent-secondary)',
    dapp: 'var(--accent-tertiary)',
    contract: '#ffaa00'
  } as const;

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <span
          className={styles.type}
          style={{ color: typeColors[drop.type] }}
        >
          {drop.type.toUpperCase()}
        </span>
        <time className={styles.date}>
          {new Date(drop.deployedAt).toLocaleDateString()}
        </time>
      </div>

      <h3 className={styles.name}>{drop.name}</h3>
      <p className={styles.description}>{drop.description}</p>

      <div className={styles.meta}>
        {drop.trendSource && <span className={styles.metaItem}>Source: {drop.trendSource}</span>}
        {drop.network && <span className={styles.metaItem}>{drop.network}</span>}
        {typeof drop.trendScore === 'number' && (
          <span className={styles.metaItem}>Score: {drop.trendScore.toFixed(1)}</span>
        )}
        {drop.gasCostEth && <span className={styles.metaItem}>Gas: {drop.gasCostEth} ETH</span>}
      </div>

      <div className={styles.links}>
        <a
          href={drop.explorerUrl ?? `https://basescan.org/address/${drop.contractAddress}`}
          target="_blank"
          className={styles.link}
          rel="noreferrer"
        >
          <span>Contract</span>
          <span className={styles.arrow}>↗</span>
        </a>
        <a
          href={drop.githubUrl}
          target="_blank"
          className={styles.link}
          rel="noreferrer"
        >
          <span>GitHub</span>
          <span className={styles.arrow}>↗</span>
        </a>
        {drop.webappUrl && (
          <a
            href={drop.webappUrl}
            target="_blank"
            className={`${styles.link} ${styles.primary}`}
            rel="noreferrer"
          >
            <span>Launch App</span>
            <span className={styles.arrow}>↗</span>
          </a>
        )}
      </div>
    </article>
  );
}
