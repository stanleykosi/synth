import { SkillsPanel } from '@/components/SkillsPanel';
import styles from './page.module.css';

export default function SkillsPage() {
  return (
    <div className={styles.page}>
      <h1>Agent Skills</h1>
      <p className={styles.description}>Edit OpenClaw skills live. Changes sync to the workspace if configured.</p>
      <SkillsPanel />
    </div>
  );
}
