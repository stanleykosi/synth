import type { TrendSignal } from '../core/types.js';
import type { AgentConfig } from '../core/config.js';
import { scoreSignal } from '../core/scoring.js';
import { summarizeDuneRows } from '../services/dune.js';

const DUNE_API_BASE = 'https://api.dune.com/api/v1';

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLatestRows(queryId: number, apiKey: string, allowPartial: boolean) {
  const url = new URL(`${DUNE_API_BASE}/query/${queryId}/results`);
  if (allowPartial) {
    url.searchParams.set('allow_partial_results', 'true');
  }
  const res = await fetchWithTimeout(url.toString(), {
    headers: { 'X-DUNE-API-KEY': apiKey }
  }, 20000);
  if (!res.ok) return null;
  const body = await res.json() as {
    result?: { rows?: Record<string, unknown>[] };
    execution_ended_at?: string;
  };
  return {
    rows: body.result?.rows ?? [],
    executionEndedAt: body.execution_ended_at
  };
}

async function executeQuery(queryId: number, apiKey: string) {
  const res = await fetchWithTimeout(`${DUNE_API_BASE}/query/${queryId}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DUNE-API-KEY': apiKey
    },
    body: JSON.stringify({})
  }, 20000);
  if (!res.ok) return null;
  const body = await res.json() as { execution_id?: string };
  return body.execution_id ?? null;
}

async function pollExecution(executionId: string, apiKey: string, maxWaitMs: number, pollIntervalMs: number) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res = await fetchWithTimeout(`${DUNE_API_BASE}/execution/${executionId}/status`, {
      headers: { 'X-DUNE-API-KEY': apiKey }
    }, 15000);
    if (!res.ok) return null;
    const body = await res.json() as {
      state?: string;
      is_execution_finished?: boolean;
    };
    const state = typeof body.state === 'string' ? body.state.toLowerCase() : '';
    if (body.is_execution_finished || state.includes('completed')) return body;
    if (state.includes('failed') || state.includes('cancel')) return body;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return null;
}

async function fetchExecutionRows(executionId: string, apiKey: string, allowPartial: boolean) {
  const url = new URL(`${DUNE_API_BASE}/execution/${executionId}/results`);
  if (allowPartial) {
    url.searchParams.set('allow_partial_results', 'true');
  }
  const res = await fetchWithTimeout(url.toString(), {
    headers: { 'X-DUNE-API-KEY': apiKey }
  }, 20000);
  if (!res.ok) return null;
  const body = await res.json() as { result?: { rows?: Record<string, unknown>[] } };
  return body.result?.rows ?? [];
}

async function fetchDuneRows(queryId: number, config: AgentConfig, apiKey: string) {
  const latest = await fetchLatestRows(queryId, apiKey, config.dune.allowPartialResults);
  const latestRows = latest?.rows ?? [];

  if (!config.dune.refreshOnRun) {
    return { rows: latestRows, refreshed: false };
  }

  let isStale = true;
  if (latest?.executionEndedAt) {
    const endedAt = Date.parse(latest.executionEndedAt);
    if (!Number.isNaN(endedAt)) {
      const ageHours = (Date.now() - endedAt) / 3_600_000;
      isStale = ageHours >= config.dune.maxAgeHours;
    }
  }

  if (!isStale) {
    return { rows: latestRows, refreshed: false };
  }

  const executionId = await executeQuery(queryId, apiKey);
  if (!executionId) {
    return { rows: latestRows, refreshed: false };
  }

  const status = await pollExecution(executionId, apiKey, config.dune.maxWaitMs, config.dune.pollIntervalMs);
  const finished = status?.is_execution_finished
    || (typeof status?.state === 'string' && status.state.toLowerCase().includes('completed'));
  if (!status || !finished) {
    return { rows: latestRows, refreshed: false };
  }

  const rows = await fetchExecutionRows(executionId, apiKey, config.dune.allowPartialResults);
  if (!rows || rows.length === 0) {
    return { rows: latestRows, refreshed: false };
  }

  return { rows, refreshed: true };
}

export async function fetchOnchainSignals(
  config: AgentConfig,
  options?: { skills?: string; context?: string }
): Promise<TrendSignal[]> {
  const apiKey = process.env.DUNE_API_KEY;
  if (!apiKey || config.dune.queryIds.length === 0) {
    return [];
  }

  const signals: TrendSignal[] = [];

  for (const queryId of config.dune.queryIds) {
    const fetched = await fetchDuneRows(queryId, config, apiKey);
    const rows = fetched.rows ?? [];
    const slice = rows.slice(0, 8);
    let summary = slice
      .map((row) => Object.entries(row).map(([key, value]) => `${key}: ${String(value)}`).join(', '))
      .join(' | ')
      .slice(0, 240);

    const llmInsight = slice.length > 0
      ? await summarizeDuneRows({ queryId, rows: slice, skills: options?.skills, context: options?.context })
      : null;
    if (llmInsight?.summary) {
      summary = llmInsight.summary;
    }

    const engagement = Math.max(30, 60 - slice.length * 3);
    signals.push({
      id: `onchain-${queryId}`,
      source: 'onchain',
      summary: summary.slice(0, 240),
      score: scoreSignal('onchain', engagement, config),
      capturedAt: new Date().toISOString(),
      url: `https://dune.com/queries/${queryId}`,
      engagement,
      meta: {
        queryId,
        rows: slice,
        refreshed: fetched.refreshed,
        analysis: llmInsight ?? undefined
      }
    });
  }

  return signals;
}
