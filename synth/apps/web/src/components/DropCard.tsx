import styles from './DropCard.module.css';

interface Drop {
  id: string;
  name: string;
  description: string;
  type: 'token' | 'nft' | 'dapp' | 'contract';
  contractAddress: string;
  githubUrl: string;
  webappUrl?: string;
  deployedAt: string;
  trend: string;
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

      <div className={styles.trend}>
        <span className={styles.trendLabel}>Synthesized from:</span>
        <span className={styles.trendValue}>{drop.trend}</span>
      </div>

      <div className={styles.links}>
        <a
          href={`https://basescan.org/address/${drop.contractAddress}`}
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
