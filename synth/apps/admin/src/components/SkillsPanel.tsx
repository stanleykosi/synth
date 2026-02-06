'use client';

import { useEffect, useState } from 'react';
import styles from './SkillsPanel.module.css';

interface SkillRecord {
  name: string;
  content: string;
  updatedAt: string;
}

export function SkillsPanel() {
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [active, setActive] = useState<SkillRecord | null>(null);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/skills')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to load skills')))
      .then((data: SkillRecord[]) => {
        setSkills(data);
        if (data[0]) {
          setActive(data[0]);
          setDraft(data[0].content);
        }
      })
      .catch(() => null);
  }, []);

  const handleSelect = (skill: SkillRecord) => {
    setActive(skill);
    setDraft(skill.content);
    setStatus(null);
  };

  const handleSave = async () => {
    if (!active) return;
    setStatus('Saving...');
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: active.name, content: draft })
    });
    if (!res.ok) {
      setStatus('Save failed');
      return;
    }
    const data = await res.json() as SkillRecord[];
    setSkills(data);
    const updated = data.find((skill) => skill.name === active.name) ?? active;
    setActive(updated);
    setStatus('Saved');
  };

  return (
    <div className={styles.panel}>
      <div className={styles.sidebar}>
        {skills.map((skill) => (
          <button
            key={skill.name}
            className={`${styles.skill} ${active?.name === skill.name ? styles.active : ''}`}
            onClick={() => handleSelect(skill)}
          >
            {skill.name}
          </button>
        ))}
      </div>
      <div className={styles.editor}>
        <textarea
          className="input"
          rows={18}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className={styles.actions}>
          <button className="btn btn-primary" onClick={handleSave}>Save Skill</button>
          {status && <span className={styles.status}>{status}</span>}
        </div>
      </div>
    </div>
  );
}
