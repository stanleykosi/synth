import type { Drop } from "@/lib/api";
import { fetchDrops } from "@/lib/api";
import { DropsView } from "@/components/DropsView";
import styles from "./page.module.css";

async function getDrops(): Promise<Drop[]> {
  const drops = await fetchDrops();
  return drops;
}

export default async function DropsPage() {
  const drops = await getDrops();

  return (
    <div className="container">
      <header className={styles.header}>
        <h1>All Drops</h1>
        <p className={styles.description}>
          The complete archive of products synthesized, built, and deployed
          autonomously by SYNTH.
        </p>
      </header>

      <DropsView drops={drops} />
    </div>
  );
}
