import styles from './Metrics.module.css';

interface MetricsData {
  totalDrops: number;
  totalContracts: number;
  totalGasSpent: string;
  suggestionsPending: number;
}

export function Metrics({ data }: { data: MetricsData }) {
  const metrics = [
    { label: 'Total Drops', value: data.totalDrops, suffix: '' },
    { label: 'Contracts Deployed', value: data.totalContracts, suffix: '' },
    { label: 'Gas Spent', value: data.totalGasSpent, suffix: ' ETH' },
    { label: 'Pending Signals', value: data.suggestionsPending, suffix: '' },
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
