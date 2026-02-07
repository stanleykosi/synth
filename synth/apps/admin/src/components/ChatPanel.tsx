'use client';

import { useEffect, useState } from 'react';
import styles from './ChatPanel.module.css';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export function ChatPanel() {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/chat')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to load chat')))
      .then((data: ChatMessage[]) => setHistory(data))
      .catch((err) => setError(err.message));
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.trim() })
    });
    if (!res.ok) {
      setError('Failed to send message');
      setSending(false);
      return;
    }
    const data = await res.json() as { history: ChatMessage[] };
    setHistory(data.history);
    setMessage('');
    setSending(false);
  };

  const handleClear = async () => {
    setError(null);
    const res = await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear-chat' })
    });
    if (!res.ok) {
      setError('Failed to clear chat');
      return;
    }
    setHistory([]);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.history}>
        {history.length === 0 ? (
          <div className={styles.empty}>No chat history yet.</div>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className={`${styles.message} ${styles[entry.role]}`}>
              <span className={styles.role}>{entry.role}</span>
              <p>{entry.content}</p>
            </div>
          ))
        )}
      </div>
      <div className={styles.inputRow}>
        <textarea
          className="input"
          rows={3}
          placeholder="Ask SYNTH to review decisions, analyze trends, or draft a deployment..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <div className={styles.actions}>
          <button className="btn btn-secondary" onClick={handleClear} disabled={sending}>
            Clear Chat
          </button>
          <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
