'use client';

import { useEffect, useState } from 'react';
import styles from './DecisionPanel.module.css';

interface EvidenceItem {
  title: string;
  url: string;
  snippet?: string;
}

interface DecisionRecord {
  createdAt: string;
  trendId: string;
  go: boolean;
  dropType: string;
  name: string;
  symbol: string;
  description: string;
  tagline: string;
  hero: string;
  cta: string;
  features: string[];
  rationale: string;
  confidence: number;
  evidence: EvidenceItem[];
}

export function DecisionPanel() {
  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/decision')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to load decision')))
      .then((data) => setDecision(data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <div className={styles.error}>Decision feed unavailable.</div>;
  }

  if (!decision) {
    return <div className={styles.empty}>No decisions yet.</div>;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h3>{decision.name}</h3>
          <p className={styles.meta}>{decision.dropType.toUpperCase()} • {decision.symbol}</p>
        </div>
        <div className={styles.confidence}>
          <span>Confidence</span>
          <strong>{Math.round(decision.confidence * 100)}%</strong>
        </div>
      </div>
      <p className={styles.rationale}>{decision.rationale}</p>
      <div className={styles.features}>
        {decision.features.map((feature) => (
          <span key={feature} className={styles.feature}>{feature}</span>
        ))}
      </div>
      <div className={styles.evidence}>
        <h4>Evidence</h4>
        {decision.evidence.length === 0 ? (
          <div className={styles.empty}>No evidence stored.</div>
        ) : (
          <ul>
            {decision.evidence.map((item) => (
              <li key={item.url}>
                <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                {item.snippet && <p>{item.snippet}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
