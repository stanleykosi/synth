import { DropCard } from '@/components/DropCard';
import type { Drop } from '@/lib/api';
import { fetchDrops } from '@/lib/api';
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

      <div className={styles.filters}>
        <button className={styles.filterActive}>All</button>
        <button className={styles.filter}>Tokens</button>
        <button className={styles.filter}>NFTs</button>
        <button className={styles.filter}>dApps</button>
      </div>

      <div className={styles.grid}>
        {drops.map((drop) => (
          <DropCard key={drop.id} drop={drop} />
        ))}
      </div>

      {drops.length === 0 && (
        <div className={styles.empty}>
          <p>No drops yet. Check back soon.</p>
        </div>
      )}
    </div>
  );
}
