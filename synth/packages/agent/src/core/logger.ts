import type { LogEntry } from './types.js';
import { loadLogs, saveLogs } from './memory.js';

export async function log(baseDir: string, level: LogEntry['level'], message: string) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message
  };

  const logs = await loadLogs(baseDir);
  logs.unshift(entry);
  await saveLogs(baseDir, logs.slice(0, 500));

  const prefix = level.toUpperCase();
  if (level === 'error') {
    console.error(`[${prefix}]`, message);
  } else if (level === 'warn') {
    console.warn(`[${prefix}]`, message);
  } else {
    console.log(`[${prefix}]`, message);
  }
}
