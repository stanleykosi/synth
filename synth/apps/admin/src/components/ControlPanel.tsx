'use client';

import { useState } from 'react';
import styles from './ControlPanel.module.css';

export function ControlPanel() {
  const [status, setStatus] = useState<'active' | 'paused'>('active');
  const [error, setError] = useState<string | null>(null);

  const handlePause = async () => {
    setError(null);
    const res = await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' }),
    });
    if (!res.ok) {
      setError('Failed to pause');
      return;
    }
    setStatus('paused');
  };

  const handleResume = async () => {
    setError(null);
    const res = await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' }),
    });
    if (!res.ok) {
      setError('Failed to resume');
      return;
    }
    setStatus('active');
  };

  return (
    <div className={styles.panel}>
      <div className={styles.status}>
        Status: <span className={status === 'active' ? styles.active : styles.paused}>
          {status.toUpperCase()}
        </span>
      </div>

      <div className={styles.buttons}>
        {status === 'active' ? (
          <button onClick={handlePause} className="btn btn-secondary">
            Pause Agent
          </button>
        ) : (
          <button onClick={handleResume} className="btn btn-primary">
            Resume Agent
          </button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
