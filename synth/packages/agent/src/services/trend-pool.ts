import { loadTrendPool, saveTrendPool } from '../core/memory.js';
import type { TrendSignal, TrendPoolEntry } from '../core/types.js';

function nowIso() {
  return new Date().toISOString();
}

function normalizeSummary(summary: string): string {
  return summary
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

export function buildTrendKey(signal: TrendSignal): string {
  return `${signal.source}:${normalizeSummary(signal.summary)}`;
}

function parseTime(value?: string): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function resolvePoolMaxEntries(): number {
  const raw = process.env.SYNTH_TREND_POOL_MAX_ENTRIES;
  const parsed = raw ? Number(raw) : 1000;
  if (!Number.isFinite(parsed) || parsed <= 0) return 1000;
  return Math.floor(parsed);
}

function resolvePoolMaxAgeHours(): number | null {
  const raw = process.env.SYNTH_TREND_POOL_MAX_AGE_HOURS;
  if (!raw) return 168;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function prunePool(pool: TrendPoolEntry[]): TrendPoolEntry[] {
  const maxEntries = resolvePoolMaxEntries();
  const maxAgeHours = resolvePoolMaxAgeHours();
  const cutoff = maxAgeHours ? Date.now() - maxAgeHours * 3_600_000 : null;

  const normalized = pool.map((entry) => ({
    ...entry,
    key: entry.key || buildTrendKey(entry)
  }));

  const filtered = normalized.filter((entry) => {
    if (!cutoff) return true;
    const time = parseTime(entry.capturedAt) ?? parseTime(entry.detectedAt);
    if (time === null) return true;
    return time >= cutoff;
  });

  const sorted = filtered.sort((a, b) => {
    const timeA = parseTime(a.detectedAt) ?? parseTime(a.capturedAt) ?? 0;
    const timeB = parseTime(b.detectedAt) ?? parseTime(b.capturedAt) ?? 0;
    return timeB - timeA;
  });

  return sorted.slice(0, maxEntries);
}

export async function appendTrendPool(baseDir: string, signals: TrendSignal[], options?: {
  runId?: string;
  detectedAt?: string;
  maxPerRun?: number;
}) {
  const pool = await loadTrendPool(baseDir);
  const detectedAt = options?.detectedAt ?? nowIso();
  const maxPerRun = Math.max(1, options?.maxPerRun ?? 25);

  const entries: TrendPoolEntry[] = signals.slice(0, maxPerRun).map((signal, index) => ({
    ...signal,
    detectedAt,
    runId: options?.runId,
    rank: index + 1,
    key: buildTrendKey(signal)
  }));

  pool.push(...entries);
  await saveTrendPool(baseDir, prunePool(pool));
  return entries;
}

export async function loadTrendPoolWindow(baseDir: string, lookbackHours: number): Promise<TrendPoolEntry[]> {
  const pool = await loadTrendPool(baseDir);
  const cutoff = Date.now() - Math.max(1, lookbackHours) * 3_600_000;
  return pool
    .filter((entry) => {
    const capturedAt = parseTime(entry.capturedAt) ?? parseTime(entry.detectedAt);
    return capturedAt !== null && capturedAt >= cutoff;
    })
    .map((entry) => ({
      ...entry,
      key: entry.key || buildTrendKey(entry)
    }));
}

export function pickLatestTrendKeys(posts: { trendKeys?: string[] }[]): Set<string> {
  const keys = new Set<string>();
  for (const post of posts) {
    if (!Array.isArray(post.trendKeys)) continue;
    for (const key of post.trendKeys) {
      if (typeof key === 'string' && key.trim().length > 0) {
        keys.add(key);
      }
    }
  }
  return keys;
}

export function sortTrendEntries(entries: TrendPoolEntry[]): TrendPoolEntry[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const timeA = parseTime(a.capturedAt) ?? 0;
    const timeB = parseTime(b.capturedAt) ?? 0;
    return timeB - timeA;
  });
}
