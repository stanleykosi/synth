import styles from './DropCard.module.css';

interface Drop {
  id: string;
  name: string;
  description: string;
  type: 'token' | 'nft' | 'dapp' | 'contract';
  contractAddress: string;
  contractType?: 'erc20' | 'erc721' | 'erc1155' | 'none';
  appMode?: 'onchain' | 'offchain';
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

  const description = drop.description.length > 140
    ? `${drop.description.slice(0, 137)}...`
    : drop.description;
  const hasContract = Boolean(drop.contractAddress);
  const explorerUrl = drop.explorerUrl ?? (hasContract ? `https://basescan.org/address/${drop.contractAddress}` : '');

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
      <p className={styles.description}>{description}</p>

      <div className={styles.meta}>
        {drop.trendSource && <span className={styles.metaItem}>Source: {drop.trendSource}</span>}
        {drop.appMode && <span className={styles.metaItem}>Mode: {drop.appMode}</span>}
        {drop.network && <span className={styles.metaItem}>{drop.network}</span>}
        {typeof drop.trendScore === 'number' && (
          <span className={styles.metaItem}>Score: {drop.trendScore.toFixed(1)}</span>
        )}
        {drop.gasCostEth && <span className={styles.metaItem}>Gas: {drop.gasCostEth} ETH</span>}
      </div>

      <div className={styles.links}>
        {hasContract && explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            className={styles.link}
            rel="noreferrer"
          >
            <span>Explorer</span>
            <span className={styles.arrow}>↗</span>
          </a>
        )}
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
