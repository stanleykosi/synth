import { runLlmTask } from './llm-runner.js';

export interface DuneMetric {
  name: string;
  latest: number;
  previous?: number;
  change?: number;
  changePct?: number;
}

export interface DuneInsight {
  summary: string;
  keyMetrics?: DuneMetric[];
  drivers?: string[];
  risks?: string[];
  build?: string;
  confidence?: number;
}

interface MetricsSnapshot {
  timeKey?: string;
  rowCount: number;
  keyMetrics: DuneMetric[];
}

const schema = {
  type: 'object',
  properties: {
    summary: { type: 'string', minLength: 40, maxLength: 280 },
    keyMetrics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          latest: { type: 'number' },
          previous: { type: 'number' },
          change: { type: 'number' },
          changePct: { type: 'number' }
        },
        required: ['name', 'latest'],
        additionalProperties: false
      },
      maxItems: 6
    },
    drivers: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    risks: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    build: { type: 'string', minLength: 20, maxLength: 200 },
    confidence: { type: 'number', minimum: 0, maximum: 1 }
  },
  required: ['summary', 'build', 'confidence'],
  additionalProperties: false
};

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseTime(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 1_000_000_000_000) return value;
    if (value > 1_000_000_000) return value * 1000;
    return null;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function detectTimeKey(rows: Record<string, unknown>[]): string | undefined {
  if (rows.length === 0) return undefined;
  const keys = Object.keys(rows[0] ?? {});
  const priority = ['date', 'day', 'week', 'month', 'hour', 'timestamp', 'block_time', 'time'];
  for (const key of priority) {
    if (keys.includes(key)) return key;
  }
  return keys.find((key) => key.toLowerCase().includes('date') || key.toLowerCase().includes('time'));
}

function buildMetricsSnapshot(rows: Record<string, unknown>[]): MetricsSnapshot {
  const timeKey = detectTimeKey(rows);
  const normalized = rows.map((row) => {
    const values: Record<string, number> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key === timeKey) continue;
      const num = coerceNumber(value);
      if (num !== null) values[key] = num;
    }
    return {
      time: timeKey ? parseTime(row[timeKey]) : null,
      values
    };
  });

  let ordered = normalized;
  if (timeKey) {
    const timed = normalized.filter((row) => row.time !== null) as Array<{ time: number; values: Record<string, number> }>;
    if (timed.length >= 2) {
      ordered = [...timed].sort((a, b) => a.time - b.time);
    }
  }

  const columns = new Set<string>();
  for (const row of ordered) {
    for (const key of Object.keys(row.values)) {
      columns.add(key);
    }
  }

  const metrics: DuneMetric[] = [];
  for (const column of columns) {
    const series = ordered.map((row) => row.values[column]).filter((val) => typeof val === 'number');
    if (series.length === 0) continue;
    const latest = series[series.length - 1];
    const previous = series.length > 1 ? series[series.length - 2] : undefined;
    const change = previous !== undefined ? latest - previous : undefined;
    const changePct = previous && previous !== 0 ? (change ?? 0) / previous * 100 : undefined;
    metrics.push({
      name: column,
      latest,
      previous,
      change,
      changePct
    });
  }

  metrics.sort((a, b) => {
    const pctA = Math.abs(a.changePct ?? 0);
    const pctB = Math.abs(b.changePct ?? 0);
    if (pctA !== pctB) return pctB - pctA;
    const changeA = Math.abs(a.change ?? 0);
    const changeB = Math.abs(b.change ?? 0);
    if (changeA !== changeB) return changeB - changeA;
    return Math.abs(b.latest) - Math.abs(a.latest);
  });

  return {
    timeKey,
    rowCount: rows.length,
    keyMetrics: metrics.slice(0, 4)
  };
}

export async function summarizeDuneRows(input: {
  queryId: number;
  rows: Record<string, unknown>[];
  skills?: string;
  context?: string;
}): Promise<DuneInsight | null> {
  const model = process.env.SYNTH_LLM_MODEL ?? 'openrouter/anthropic/claude-3.5-haiku';
  const maxTokens = process.env.SYNTH_LLM_MAX_TOKENS ? Number(process.env.SYNTH_LLM_MAX_TOKENS) : 650;
  const metricsSnapshot = buildMetricsSnapshot(input.rows);

  const prompt = [
    'You are SYNTH, a senior onchain analyst.',
    'Interpret Dune query results into a decision-ready insight.',
    'Use metricsSnapshot to include at least one numeric data point when possible.',
    'Explain direction, magnitude, and implications for a Base L2 product.',
    'Provide a concrete build angle (token/NFT/dapp) or explain why to skip.',
    'Return JSON only.',
    input.skills ? 'Use the skills guidance provided when relevant.' : '',
    input.context ? 'Follow the persona and operator preferences provided.' : ''
  ].join('\n');

  const payload = {
    prompt,
    input: {
      queryId: input.queryId,
      rows: input.rows,
      metricsSnapshot
    },
    schema,
    model,
    maxTokens
  };

  try {
    const result = await runLlmTask<unknown>(payload);
    if (!result || typeof result !== 'object') return null;
    const data = result as DuneInsight;
    const summary = String(data.summary ?? '').trim();
    if (!summary) return null;
    const keyMetrics = Array.isArray(data.keyMetrics)
      ? data.keyMetrics.filter((metric) => metric && typeof metric.name === 'string' && typeof metric.latest === 'number').slice(0, 6)
      : undefined;
    const drivers = Array.isArray(data.drivers)
      ? data.drivers.filter((item) => typeof item === 'string' && item.trim().length > 0).slice(0, 4)
      : undefined;
    const risks = Array.isArray(data.risks)
      ? data.risks.filter((item) => typeof item === 'string' && item.trim().length > 0).slice(0, 4)
      : undefined;
    const build = data.build ? String(data.build).trim() : undefined;
    const confidence = typeof data.confidence === 'number' ? data.confidence : undefined;

    return {
      summary,
      keyMetrics,
      drivers,
      risks,
      build,
      confidence
    };
  } catch {
    return null;
  }
}
