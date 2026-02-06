import fs from 'fs/promises';
import path from 'path';

async function readIfExists(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content.trim();
  } catch {
    return '';
  }
}

export async function buildAgentContext(baseDir: string): Promise<string> {
  const soul = await readIfExists(path.join(baseDir, 'SOUL.md'));
  const user = await readIfExists(path.join(baseDir, 'USER.md'));
  const tools = await readIfExists(path.join(baseDir, 'TOOLS.md'));

  const sections: string[] = [];
  if (soul) sections.push(`## SOUL\n${soul}`);
  if (user) sections.push(`## USER\n${user}`);
  if (tools) sections.push(`## TOOLS\n${tools}`);

  return sections.join('\n\n');
}
