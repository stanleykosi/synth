import path from 'path';
import fs from 'fs';
import { config as loadEnv } from 'dotenv';

function tryLoadEnv(filePath: string) {
  if (fs.existsSync(filePath)) {
    loadEnv({ path: filePath, override: false });
  }
}

export function loadEnvironment(baseDir: string) {
  const home = process.env.HOME ?? '';
  const candidates = [
    process.env.SYNTH_ENV_PATH,
    process.env.OPENCLAW_ENV_PATH,
    path.join(home, '.openclaw', '.env'),
    path.join(baseDir, '.env')
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    tryLoadEnv(candidate);
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}
