import fs from 'fs/promises';
import path from 'path';

interface SkillEntry {
  name: string;
  content: string;
}

const MAX_SKILL_CHARS = 1200;
const MAX_TOTAL_CHARS = 4000;

async function loadSkillEntries(baseDir: string, include?: string[]): Promise<SkillEntry[]> {
  const skillsDir = path.join(baseDir, 'skills');
  const entries = await fs.readdir(skillsDir, { withFileTypes: true }).catch(() => []);
  const skills: SkillEntry[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (include && include.length > 0 && !include.includes(entry.name)) continue;
    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    try {
      const content = await fs.readFile(skillPath, 'utf-8');
      skills.push({ name: entry.name, content: content.trim() });
    } catch {
      continue;
    }
  }
  return skills;
}

export async function buildSkillsContext(
  baseDir: string,
  options?: { include?: string[]; maxChars?: number }
): Promise<string> {
  const entries = await loadSkillEntries(baseDir, options?.include);
  if (entries.length === 0) return '';

  let total = 0;
  const sections: string[] = [];
  const maxTotal = options?.maxChars ?? MAX_TOTAL_CHARS;
  for (const entry of entries) {
    const trimmed = entry.content.slice(0, MAX_SKILL_CHARS);
    const section = `## ${entry.name}\n${trimmed}`;
    if (total + section.length > maxTotal) break;
    sections.push(section);
    total += section.length;
  }

  return sections.join('\n\n');
}
