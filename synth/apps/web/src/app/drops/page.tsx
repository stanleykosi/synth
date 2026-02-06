import type { Drop } from '@/lib/api';
import { fetchDrops } from '@/lib/api';
import { DropsView } from '@/components/DropsView';
import styles from './page.module.css';

async function getDrops(): Promise<Drop[]> {
  try {
    return await fetchDrops();
  } catch {
    return [];
  }
}

export default async function DropsPage() {
  const drops = await getDrops();

  return (
    <div className="container">
      <div className={styles.header}>
        <h1>All Drops</h1>
        <p className={styles.description}>
          Every product SYNTH has synthesized and deployed.
        </p>
      </div>

      <DropsView drops={drops} />
    </div>
  );
}
