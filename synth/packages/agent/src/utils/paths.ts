import path from 'path';
import fs from 'fs';

export function resolveAgentBase(): string {
  if (process.env.SYNTH_AGENT_DIR) {
    return process.env.SYNTH_AGENT_DIR;
  }
  const cwd = process.cwd();
  const candidate = path.join(cwd, 'packages', 'agent');
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return cwd;
}

export function resolveMemoryDir(baseDir: string): string {
  return path.join(baseDir, 'memory');
}

export function resolveConfigPath(baseDir: string): string {
  return path.join(baseDir, 'agent.config.json');
}

export function resolveTemplatesDir(baseDir: string): string {
  return path.join(baseDir, 'templates');
}
