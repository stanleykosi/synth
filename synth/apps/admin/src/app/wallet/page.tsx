import { WalletStatus } from '@/components/WalletStatus';
import styles from './page.module.css';

export default function WalletPage() {
  return (
    <div className={styles.page}>
      <h1>Wallet</h1>
      <p className={styles.description}>Live view of the SYNTH deployer wallet.</p>
      <WalletStatus />
    </div>
  );
}
