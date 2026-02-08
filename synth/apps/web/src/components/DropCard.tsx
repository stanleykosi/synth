import {
  ExternalLink,
  Github,
  Rocket,
  FileCode,
  Image,
  Box,
  Cpu,
} from "lucide-react";
import styles from "./DropCard.module.css";

interface Drop {
  id: string;
  name: string;
  description: string;
  type: "token" | "nft" | "dapp" | "contract";
  contractAddress: string;
  contractType?: 'erc20' | 'erc721' | 'erc1155' | 'none';
  appMode?: 'onchain' | 'offchain';
  builder?: {
    address: string;
    stakeEth?: number;
    suggestionId?: string;
    stakeReturned?: boolean;
  };
  githubUrl: string;
  webappUrl?: string;
  explorerUrl?: string;
  network?: string;
  deployedAt: string;
  trend: string;
  trendSource?: string;
  trendScore?: number;
  trendEngagement?: number;
  txHash?: string;
  gasCostEth?: string;
}

const typeConfig = {
  token: { icon: FileCode, color: "var(--accent-primary)" },
  nft: { icon: Image, color: "var(--accent-secondary)" },
  dapp: { icon: Rocket, color: "var(--accent-tertiary)" },
  contract: { icon: Cpu, color: "var(--text-muted)" },
} as const;

export function DropCard({ drop }: { drop: Drop }) {
  const { icon: TypeIcon, color } = typeConfig[drop.type];

  const description = drop.description.length > 140
    ? `${drop.description.slice(0, 137)}...`
    : drop.description;
  const hasContract = Boolean(drop.contractAddress);
  const explorerUrl = drop.explorerUrl ?? (hasContract ? `https://basescan.org/address/${drop.contractAddress}` : '');
  const builderAddress = drop.builder?.address;
  const builderLabel = builderAddress ? `${builderAddress.slice(0, 6)}…${builderAddress.slice(-4)}` : '';

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <span className={styles.type} style={{ color }}>
          <TypeIcon size={12} />
          {drop.type.toUpperCase()}
        </span>
        <time className={styles.date}>
          {new Date(drop.deployedAt).toLocaleDateString()}
        </time>
      </div>

      <h3 className={styles.name}>{drop.name}</h3>
      <p className={styles.description}>{description}</p>

      <div className={styles.meta}>
        {drop.trendSource && (
          <span className={styles.metaItem}>Source: {drop.trendSource}</span>
        )}
        {drop.appMode && <span className={styles.metaItem}>Mode: {drop.appMode}</span>}
        {drop.network && (
          <span className={styles.metaItem}>{drop.network}</span>
        )}
        {typeof drop.trendScore === "number" && (
          <span className={styles.metaItem}>
            Score: {drop.trendScore.toFixed(1)}
          </span>
        )}
        {typeof drop.trendEngagement === 'number' && (
          <span className={styles.metaItem}>Engagement: {Math.round(drop.trendEngagement)}</span>
        )}
        {drop.gasCostEth && (
          <span className={styles.metaItem}>Gas: {drop.gasCostEth} ETH</span>
        )}
        {builderAddress && (
          <span className={styles.metaItem}>
            Builder: {builderLabel}
            {typeof drop.builder?.stakeEth === 'number' ? ` • Stake ${drop.builder.stakeEth.toFixed(4)} ETH` : ''}
            {drop.builder?.stakeReturned ? ' • Returned' : ''}
          </span>
        )}
      </div>

      <div className={styles.links}>
        <a
          href={
            drop.explorerUrl ??
            `https://basescan.org/address/${drop.contractAddress}`
          }
          target="_blank"
          className={styles.link}
          rel="noreferrer"
        >
          <Box size={12} />
          Contract
          <ExternalLink size={10} />
        </a>
        <a
          href={drop.githubUrl}
          target="_blank"
          className={styles.link}
          rel="noreferrer"
        >
          <Github size={12} />
          GitHub
          <ExternalLink size={10} />
        </a>
        {drop.webappUrl && (
          <a
            href={drop.webappUrl}
            target="_blank"
            className={`${styles.link} ${styles.primary}`}
            rel="noreferrer"
          >
            <Rocket size={12} />
            Launch App
            <ExternalLink size={10} />
          </a>
        )}
      </div>
    </article>
  );
}
