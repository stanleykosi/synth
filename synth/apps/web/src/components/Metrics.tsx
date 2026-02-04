import styles from './Metrics.module.css';

interface MetricsData {
  totalDrops: number;
  contractsByType: Record<'token' | 'nft' | 'dapp' | 'contract', number>;
  suggestionsReceived: number;
  suggestionsBuilt: number;
}

export function Metrics({ data }: { data: MetricsData }) {
  const totalContracts = Object.values(data.contractsByType).reduce((sum, value) => sum + value, 0);
  const metrics = [
    { label: 'Total Drops', value: data.totalDrops, suffix: '' },
    { label: 'Contracts Deployed', value: totalContracts, suffix: '' },
    { label: 'Suggestions Received', value: data.suggestionsReceived, suffix: '' },
    { label: 'Suggestions Built', value: data.suggestionsBuilt, suffix: '' },
  ];

  return (
    <div className={styles.grid}>
      {metrics.map((metric) => (
        <div key={metric.label} className={styles.card}>
          <span className={styles.value}>
            {metric.value}{metric.suffix}
          </span>
          <span className={styles.label}>{metric.label}</span>
        </div>
      ))}
    </div>
  );
}
