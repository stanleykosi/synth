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
  const [newSkillName, setNewSkillName] = useState('');

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

  const handleSaveAsNew = async () => {
    if (!newSkillName.trim()) {
      setStatus('Enter a new skill name');
      return;
    }
    setStatus('Saving...');
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSkillName.trim(), content: draft })
    });
    if (!res.ok) {
      setStatus('Save failed');
      return;
    }
    const data = await res.json() as SkillRecord[];
    setSkills(data);
    const created = data.find((skill) => skill.name === newSkillName.trim());
    if (created) {
      setActive(created);
      setDraft(created.content);
    }
    setNewSkillName('');
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
        <div className={styles.newSkill}>
          <input
            className="input"
            placeholder="New skill name (e.g., data-synth)"
            value={newSkillName}
            onChange={(event) => setNewSkillName(event.target.value)}
          />
          <button className="btn btn-secondary" onClick={handleSaveAsNew}>Save as New</button>
        </div>
      </div>
    </div>
  );
}
