'use client';

import { useEffect, useState } from 'react';
import styles from './ControlPanel.module.css';

export function ControlPanel() {
  const [status, setStatus] = useState<'active' | 'paused'>('active');
  const [error, setError] = useState<string | null>(null);
  const [overrideId, setOverrideId] = useState('');

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to load status')))
      .then((data) => setStatus(data.paused ? 'paused' : 'active'))
      .catch(() => null);
  }, []);

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

  const handleRun = async () => {
    setError(null);
    const res = await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'run' }),
    });
    if (!res.ok) {
      setError('Failed to start run');
      return;
    }
  };

  const handleUnlock = async () => {
    setError(null);
    const res = await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unlock' }),
    });
    if (!res.ok) {
      setError('Failed to unlock run');
      return;
    }
  };

  const handleClearDrops = async () => {
    if (!confirm('Clear all drop records? This cannot be undone.')) {
      return;
    }
    setError(null);
    const res = await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear-drops' }),
    });
    if (!res.ok) {
      setError('Failed to clear drops');
      return;
    }
  };

  const handleResetMemory = async () => {
    if (!confirm('Reset all memory (drops, trends, decisions, logs)?')) {
      return;
    }
    setError(null);
    const res = await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset-memory' }),
    });
    if (!res.ok) {
      setError('Failed to reset memory');
      return;
    }
  };

  const handleOverride = async () => {
    if (!overrideId.trim()) {
      setError('Enter a signal id to override');
      return;
    }
    setError(null);
    const res = await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'override', signalId: overrideId.trim() }),
    });
    if (!res.ok) {
      setError('Failed to set override');
      return;
    }
    setOverrideId('');
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
        <button onClick={handleRun} className="btn btn-secondary">
          Run Now
        </button>
        <button onClick={handleUnlock} className="btn btn-secondary">
          Unlock Run
        </button>
        <button onClick={handleClearDrops} className="btn btn-secondary">
          Clear Drops
        </button>
        <button onClick={handleResetMemory} className="btn btn-secondary">
          Reset Memory
        </button>
      </div>

      <div className={styles.override}>
        <input
          value={overrideId}
          onChange={(event) => setOverrideId(event.target.value)}
          placeholder="Override signal id"
          className="input"
        />
        <button onClick={handleOverride} className="btn btn-secondary">
          Override
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
