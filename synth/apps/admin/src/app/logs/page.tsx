import { LogViewer } from '@/components/LogViewer';
import styles from './page.module.css';

export default function LogsPage() {
  return (
    <div className={styles.page}>
      <h1>Decision Logs</h1>
      <p className={styles.description}>Audit trail of SYNTH decisions and daily cycles.</p>
      <LogViewer />
    </div>
  );
}
