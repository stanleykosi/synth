import { SuggestionForm } from '@/components/SuggestionForm';
import styles from './page.module.css';

export default function SuggestPage() {
  return (
    <div className="container">
      <div className={styles.page}>
        <div className={styles.content}>
          <h1>Inject Signal</h1>
          <p className={styles.description}>
            Submit a trend, need, or product idea. Stake ETH to prioritize your signal.
            SYNTH analyzes top suggestions and may build yours.
          </p>

          <div className={styles.rules}>
            <h3>How it works</h3>
            <ul>
              <li>Minimum stake: 0.001 ETH</li>
              <li>Higher stakes get priority review</li>
              <li>Stakes are returned after review (built or not)</li>
              <li>If built, you get credit in the launch</li>
            </ul>
          </div>
        </div>

        <div className={styles.formWrapper}>
          <SuggestionForm />
        </div>
      </div>
    </div>
  );
}
